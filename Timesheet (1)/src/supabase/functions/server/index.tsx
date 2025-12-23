import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "Cache-Control"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Initialize Supabase client for storage
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// Ensure storage bucket exists
const BUCKET_NAME = 'make-3af6643f-timesheet-photos';
async function ensureBucketExists() {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);
    if (!bucketExists) {
      const { error } = await supabase.storage.createBucket(BUCKET_NAME, { public: false });
      if (error) {
        console.log('Error creating bucket:', error);
      } else {
        console.log('Bucket created successfully:', BUCKET_NAME);
      }
    } else {
      console.log('Bucket already exists:', BUCKET_NAME);
    }
  } catch (error) {
    console.log('Error ensuring bucket exists:', error);
  }
}
ensureBucketExists();

// Helper function to verify user
async function verifyUser(authHeader: string | null) {
  if (!authHeader) return null;
  const accessToken = authHeader.split(' ')[1];
  const supabaseAuth = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
  const { data: { user }, error } = await supabaseAuth.auth.getUser(accessToken);
  if (error || !user) return null;
  return user;
}

// Health check endpoint
app.get("/make-server-3af6643f/health", (c) => {
  return c.json({ status: "ok" });
});

// ========== AUTH ROUTES ==========

// Sign up new user
app.post("/make-server-3af6643f/signup", async (c) => {
  try {
    const { email, password, name, organizationName, inviteCode, role = 'staff' } = await c.req.json();
    
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    // Create auth user
    const { data, error } = await supabaseAuth.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });
    
    if (error) {
      console.log('Error creating user during signup:', error);
      return c.json({ error: error.message }, 400);
    }
    
    const userId = data.user.id;
    
    // Create or join organization
    let orgId;
    let userRole = role;
    
    // If invite code is provided, validate and join that organization
    if (inviteCode) {
      const codes = await kv.getByPrefix('invite-codes:');
      const validCode = codes.find((c: any) => 
        c.code === inviteCode && 
        c.isActive && 
        (!c.expiresAt || new Date(c.expiresAt) > new Date()) &&
        (!c.maxUses || c.currentUses < c.maxUses)
      );
      
      if (!validCode) {
        // Delete the created user if invite code is invalid
        await supabaseAuth.auth.admin.deleteUser(userId);
        return c.json({ error: 'Invalid or expired invite code' }, 400);
      }
      
      orgId = validCode.orgId;
      userRole = 'staff'; // Users joining via invite code are always staff
      
      // Update invite code usage
      await kv.set(`invite-codes:${validCode.id}`, {
        ...validCode,
        currentUses: validCode.currentUses + 1,
      });
      
      await kv.set(`users:${userId}`, {
        id: userId,
        email,
        name,
        role: userRole,
        orgId,
        createdAt: new Date().toISOString(),
      });
    } else if (organizationName) {
      // Create new organization
      orgId = `org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await kv.set(`organizations:${orgId}`, {
        id: orgId,
        name: organizationName,
        createdAt: new Date().toISOString(),
        createdBy: userId,
      });
      
      // Set user as admin if they created the org
      await kv.set(`users:${userId}`, {
        id: userId,
        email,
        name,
        role: 'admin',
        orgId,
        createdAt: new Date().toISOString(),
      });
    } else {
      // User will be assigned to org by admin later
      await kv.set(`users:${userId}`, {
        id: userId,
        email,
        name,
        role: userRole,
        orgId: null,
        createdAt: new Date().toISOString(),
      });
    }
    
    if (orgId) {
      await kv.set(`user-org:${userId}`, orgId);
      const orgUsers = await kv.get(`org-users:${orgId}`) || [];
      await kv.set(`org-users:${orgId}`, [...orgUsers, userId]);
    }
    
    return c.json({ 
      success: true, 
      userId,
      orgId,
      message: 'User created successfully' 
    });
  } catch (error) {
    console.log('Error during signup:', error);
    return c.json({ error: 'Signup failed' }, 500);
  }
});

// ========== INVITE CODE ROUTES ==========

// Test endpoint to list all invite codes (for debugging)
app.get("/make-server-3af6643f/test-codes", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    );
    
    // Get all keys that start with 'invite-codes:'
    const { data, error } = await supabase
      .from('kv_store_3af6643f')
      .select('key, value')
      .like('key', 'invite-codes:%');
    
    if (error) {
      console.error('Error fetching codes from DB:', error);
      return c.json({ error: error.message }, 500);
    }
    
    console.log('Raw database data:', data);
    
    return c.json({ 
      count: data?.length || 0,
      codes: data || [],
      raw: data
    });
  } catch (error) {
    console.error('Error in test-codes endpoint:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Database write/read test endpoint
app.get("/make-server-3af6643f/test-database", async (c) => {
  const testLog: string[] = [];
  
  try {
    testLog.push('Starting database test...');
    
    // Test 1: Write a simple value
    const testKey = `test-key-${Date.now()}`;
    const testValue = { message: 'Hello from test', timestamp: Date.now() };
    
    testLog.push(`Test 1: Writing to key: ${testKey}`);
    try {
      await kv.set(testKey, testValue);
      testLog.push('✅ Write successful');
    } catch (writeError) {
      testLog.push(`❌ Write failed: ${writeError.message}`);
      return c.json({ success: false, log: testLog, error: writeError.message });
    }
    
    // Test 2: Read the value back
    testLog.push(`Test 2: Reading key: ${testKey}`);
    try {
      const retrieved = await kv.get(testKey);
      if (retrieved && retrieved.message === testValue.message) {
        testLog.push('✅ Read successful - value matches');
      } else {
        testLog.push(`❌ Read failed - got: ${JSON.stringify(retrieved)}`);
      }
    } catch (readError) {
      testLog.push(`❌ Read failed: ${readError.message}`);
    }
    
    // Test 3: Try to read using getByPrefix
    testLog.push(`Test 3: Reading by prefix: test-key`);
    try {
      const prefixResults = await kv.getByPrefix('test-key');
      testLog.push(`✅ Prefix search returned ${prefixResults.length} results`);
    } catch (prefixError) {
      testLog.push(`❌ Prefix search failed: ${prefixError.message}`);
    }
    
    // Clean up
    testLog.push(`Cleaning up test key...`);
    try {
      await kv.del(testKey);
      testLog.push('✅ Cleanup successful');
    } catch (delError) {
      testLog.push(`⚠️ Cleanup failed: ${delError.message}`);
    }
    
    testLog.push('Database test complete!');
    
    return c.json({ success: true, log: testLog });
  } catch (error) {
    testLog.push(`❌ Test failed with error: ${error.message}`);
    return c.json({ success: false, log: testLog, error: error.message }, 500);
  }
});

// Test endpoint to check a specific invite code
app.get("/make-server-3af6643f/test-code/:code", async (c) => {
  try {
    const code = c.req.param('code');
    console.log('Checking for specific code:', code);
    
    // Get all invite codes
    const allCodes = await kv.getByPrefix('invite-codes:');
    console.log('Total codes in database:', allCodes.length);
    
    // Find the specific code
    const foundCode = allCodes.find((c: any) => c.code === code);
    
    if (foundCode) {
      console.log('Code found:', foundCode);
      return c.json({
        found: true,
        value: foundCode,
        key: `invite-codes:${foundCode.id}`,
      });
    } else {
      console.log('Code not found. All codes:', allCodes.map((c: any) => c.code));
      return c.json({
        found: false,
        totalCodes: allCodes.length,
        allCodes: allCodes.map((c: any) => ({ code: c.code, id: c.id, orgId: c.orgId })),
      });
    }
  } catch (error) {
    console.error('Error checking specific code:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Create invite code (admin only)
app.post("/make-server-3af6643f/invite-codes", async (c) => {
  try {
    console.log('=== CREATE INVITE CODE START ===');
    
    const user = await verifyUser(c.req.header('Authorization'));
    console.log('User verified:', user?.id);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const currentUser = await kv.get(`users:${user.id}`);
    console.log('Current user:', currentUser);
    
    if (currentUser.role !== 'admin') {
      console.log('User is not admin, role:', currentUser.role);
      return c.json({ error: 'Forbidden - Admin only' }, 403);
    }
    
    const { expiresInDays, maxUses } = await c.req.json();
    console.log('Request params:', { expiresInDays, maxUses });
    
    // Generate random 8-character code
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const codeId = `code_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('Generated code:', code);
    console.log('Generated codeId:', codeId);
    
    let expiresAt = null;
    if (expiresInDays && expiresInDays > 0) {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + expiresInDays);
      expiresAt = expiry.toISOString();
    }
    
    const inviteCode = {
      id: codeId,
      code,
      orgId: currentUser.orgId,
      createdBy: user.id,
      createdAt: new Date().toISOString(),
      expiresAt,
      maxUses: maxUses || null,
      currentUses: 0,
      isActive: true,
    };
    
    console.log('Invite code object to save:', inviteCode);
    console.log('Saving to key:', `invite-codes:${codeId}`);
    
    try {
      await kv.set(`invite-codes:${codeId}`, inviteCode);
      console.log('✅ Code saved to database successfully');
    } catch (kvError) {
      console.error('❌ KV SET ERROR:', kvError);
      console.error('Error message:', kvError.message);
      console.error('Error stack:', kvError.stack);
      throw kvError; // Re-throw to be caught by outer catch
    }
    
    // Verify it was saved
    try {
      const savedCode = await kv.get(`invite-codes:${codeId}`);
      console.log('✅ Verification - code retrieved:', savedCode);
      
      if (!savedCode) {
        console.error('❌ WARNING: Code was not retrieved after save!');
      }
    } catch (verifyError) {
      console.error('❌ Error verifying saved code:', verifyError);
    }
    
    // Add to org's invite codes index
    try {
      const orgCodes = await kv.get(`org-invite-codes:${currentUser.orgId}`) || [];
      console.log('Current org codes:', orgCodes);
      await kv.set(`org-invite-codes:${currentUser.orgId}`, [...orgCodes, codeId]);
      console.log('✅ Code added to org index');
    } catch (orgError) {
      console.error('❌ Error adding to org index:', orgError);
      // Don't fail the whole operation if this fails
    }
    
    console.log('=== CREATE INVITE CODE END (SUCCESS) ===');
    
    return c.json({ success: true, inviteCode });
  } catch (error) {
    console.error('❌❌❌ ERROR CREATING INVITE CODE ❌❌❌');
    console.error('Error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.log('=== CREATE INVITE CODE END (ERROR) ===');
    return c.json({ error: 'Failed to create invite code: ' + error.message }, 500);
  }
});

// Get organization's invite codes (admin only)
app.get("/make-server-3af6643f/invite-codes/:orgId", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const currentUser = await kv.get(`users:${user.id}`);
    const orgId = c.req.param('orgId');
    
    if (currentUser.orgId !== orgId || currentUser.role !== 'admin') {
      return c.json({ error: 'Forbidden' }, 403);
    }
    
    const codeIds = await kv.get(`org-invite-codes:${orgId}`) || [];
    const codes = await kv.mget(codeIds.map((id: string) => `invite-codes:${id}`));
    
    return c.json(codes);
  } catch (error) {
    console.log('Error fetching invite codes:', error);
    return c.json({ error: 'Failed to fetch invite codes' }, 500);
  }
});

// Toggle invite code active status (admin only)
app.put("/make-server-3af6643f/invite-codes/:codeId/toggle", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const currentUser = await kv.get(`users:${user.id}`);
    if (currentUser.role !== 'admin') {
      return c.json({ error: 'Forbidden - Admin only' }, 403);
    }
    
    const codeId = c.req.param('codeId');
    const inviteCode = await kv.get(`invite-codes:${codeId}`);
    
    if (!inviteCode) {
      return c.json({ error: 'Invite code not found' }, 404);
    }
    
    if (inviteCode.orgId !== currentUser.orgId) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    
    const updatedCode = {
      ...inviteCode,
      isActive: !inviteCode.isActive,
    };
    
    await kv.set(`invite-codes:${codeId}`, updatedCode);
    
    return c.json({ success: true, inviteCode: updatedCode });
  } catch (error) {
    console.log('Error toggling invite code:', error);
    return c.json({ error: 'Failed to toggle invite code' }, 500);
  }
});

// Delete invite code (admin only)
app.delete("/make-server-3af6643f/invite-codes/:codeId", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const currentUser = await kv.get(`users:${user.id}`);
    if (currentUser.role !== 'admin') {
      return c.json({ error: 'Forbidden - Admin only' }, 403);
    }
    
    const codeId = c.req.param('codeId');
    const inviteCode = await kv.get(`invite-codes:${codeId}`);
    
    if (!inviteCode) {
      return c.json({ error: 'Invite code not found' }, 404);
    }
    
    if (inviteCode.orgId !== currentUser.orgId) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    
    await kv.del(`invite-codes:${codeId}`);
    
    // Remove from org's invite codes index
    const orgCodes = await kv.get(`org-invite-codes:${currentUser.orgId}`) || [];
    await kv.set(`org-invite-codes:${currentUser.orgId}`, 
      orgCodes.filter((id: string) => id !== codeId)
    );
    
    return c.json({ success: true });
  } catch (error) {
    console.log('Error deleting invite code:', error);
    return c.json({ error: 'Failed to delete invite code' }, 500);
  }
});

// Verify invite code (public endpoint - no auth required)
app.get("/make-server-3af6643f/verify-invite-code/:code", async (c) => {
  console.log('=== VERIFY ENDPOINT CALLED (GET) ===');
  console.log('Headers:', Object.fromEntries(c.req.raw.headers.entries()));
  
  try {
    const code = c.req.param('code');
    
    if (!code) {
      console.log('No code provided in URL parameter');
      return c.json({ valid: false, error: 'No invite code provided' });
    }

    console.log('Looking up code:', code);
    
    // Get all invite codes
    const codes = await kv.getByPrefix('invite-codes:');
    console.log('Found codes in database:', codes.length);
    
    // Find matching code
    const inviteCode = codes.find((c: any) => c.code === code);
    console.log('Matching code found:', !!inviteCode);
    
    if (!inviteCode) {
      console.log('Code not found');
      return c.json({ valid: false, error: 'Invalid invite code' });
    }
    
    // Check if code is active
    if (!inviteCode.isActive) {
      console.log('Code is inactive');
      return c.json({ valid: false, error: 'This invite code has been deactivated' });
    }
    
    // Check if code has expired
    if (inviteCode.expiresAt && new Date(inviteCode.expiresAt) < new Date()) {
      console.log('Code has expired');
      return c.json({ valid: false, error: 'This invite code has expired' });
    }
    
    // Check if code has reached max uses
    if (inviteCode.maxUses && inviteCode.currentUses >= inviteCode.maxUses) {
      console.log('Code has reached max uses');
      return c.json({ valid: false, error: 'This invite code has reached its maximum number of uses' });
    }
    
    // Get organization name
    const org = await kv.get(`organizations:${inviteCode.orgId}`);
    console.log('Organization found:', !!org);
    
    if (!org) {
      console.log('Organization not found for code');
      return c.json({ valid: false, error: 'Organization not found' });
    }
    
    console.log('Code verified successfully');
    return c.json({ 
      valid: true, 
      organizationName: org.name,
      organizationId: org.id 
    });
  } catch (error: any) {
    console.error('Error verifying invite code:', error);
    return c.json({ valid: false, error: 'Failed to verify invite code' }, 500);
  }
});

// Also keep the POST version for backward compatibility
app.post("/make-server-3af6643f/verify-invite-code", async (c) => {
  console.log('=== VERIFY ENDPOINT CALLED (POST) ===');
  console.log('Headers:', Object.fromEntries(c.req.raw.headers.entries()));
  
  try {
    const { code } = await c.req.json();
    
    if (!code) {
      console.log('No code provided in request');
      return c.json({ valid: false, error: 'No invite code provided' });
    }
    
    console.log('=== VERIFY INVITE CODE START ===');
    console.log('Received code:', code);
    console.log('Code type:', typeof code);
    console.log('Code length:', code.length);
    
    const allCodes = await kv.getByPrefix('invite-codes:');
    console.log('Total codes in database:', allCodes.length);
    
    if (allCodes.length === 0) {
      console.log('WARNING: No invite codes found in database');
      return c.json({ valid: false, error: 'No invite codes found in system' });
    }
    
    // Log all codes for debugging
    allCodes.forEach((codeObj: any, index: number) => {
      console.log(`Code ${index + 1}:`, {
        id: codeObj.id,
        code: codeObj.code,
        orgId: codeObj.orgId,
        isActive: codeObj.isActive,
        expiresAt: codeObj.expiresAt,
        maxUses: codeObj.maxUses,
        currentUses: codeObj.currentUses
      });
    });
    
    const validCode = allCodes.find((c: any) => {
      const codeMatch = c.code === code;
      const isActive = c.isActive === true;
      const notExpired = !c.expiresAt || new Date(c.expiresAt) > new Date();
      const hasUsesLeft = !c.maxUses || c.currentUses < c.maxUses;
      
      console.log(`Checking code ${c.code}:`, {
        codeMatch,
        isActive,
        notExpired,
        hasUsesLeft,
        overall: codeMatch && isActive && notExpired && hasUsesLeft
      });
      
      return codeMatch && isActive && notExpired && hasUsesLeft;
    });
    
    if (!validCode) {
      console.log('No valid code found');
      console.log('=== VERIFY INVITE CODE END (INVALID) ===');
      return c.json({ valid: false, error: 'Invalid or expired invite code' });
    }
    
    console.log('Valid code found:', validCode.code);
    
    // Get organization name
    const org = await kv.get(`organizations:${validCode.orgId}`);
    console.log('Organization:', org);
    console.log('=== VERIFY INVITE CODE END (VALID) ===');
    
    return c.json({ 
      valid: true, 
      organizationName: org?.name || 'Unknown Organization',
      orgId: validCode.orgId 
    });
  } catch (error) {
    console.error('Error verifying invite code:', error);
    return c.json({ valid: false, error: 'Failed to verify invite code: ' + error.message }, 500);
  }
});

// ========== ORGANIZATION ROUTES ==========

// Get organization details
app.get("/make-server-3af6643f/organizations/:orgId", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const orgId = c.req.param('orgId');
    const org = await kv.get(`organizations:${orgId}`);
    
    if (!org) {
      return c.json({ error: 'Organization not found' }, 404);
    }
    
    return c.json(org);
  } catch (error) {
    console.log('Error fetching organization:', error);
    return c.json({ error: 'Failed to fetch organization' }, 500);
  }
});

// ========== USER ROUTES ==========

// Get current user profile
app.get("/make-server-3af6643f/users/me", async (c) => {
  try {
    console.log('Fetching user profile...');
    const authHeader = c.req.header('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    const user = await verifyUser(authHeader);
    if (!user) {
      console.log('User verification failed - no user returned');
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    console.log('User verified, ID:', user.id);
    
    const userProfile = await kv.get(`users:${user.id}`);
    console.log('User profile found:', !!userProfile);
    
    if (!userProfile) {
      console.log('User profile not found in KV store for user:', user.id);
      return c.json({ error: 'User profile not found' }, 404);
    }
    
    console.log('Returning user profile');
    return c.json(userProfile);
  } catch (error) {
    console.log('Error fetching user profile:', error);
    console.error('Error details:', error.message, error.stack);
    return c.json({ error: 'Failed to fetch user profile: ' + error.message }, 500);
  }
});

// Update user profile
app.put("/make-server-3af6643f/users/me", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const updates = await c.req.json();
    const currentProfile = await kv.get(`users:${user.id}`);
    
    if (!currentProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }
    
    const updatedProfile = {
      ...currentProfile,
      ...updates,
      id: user.id, // Don't allow changing ID
      role: currentProfile.role, // Don't allow self role change
      orgId: currentProfile.orgId, // Don't allow self org change
    };
    
    await kv.set(`users:${user.id}`, updatedProfile);
    
    return c.json({ success: true, user: updatedProfile });
  } catch (error) {
    console.log('Error updating user profile:', error);
    return c.json({ error: 'Failed to update user profile' }, 500);
  }
});

// Get all users in organization (admin only)
app.get("/make-server-3af6643f/organizations/:orgId/users", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const currentUser = await kv.get(`users:${user.id}`);
    const orgId = c.req.param('orgId');
    
    if (currentUser.orgId !== orgId || currentUser.role !== 'admin') {
      return c.json({ error: 'Forbidden' }, 403);
    }
    
    const userIds = await kv.get(`org-users:${orgId}`) || [];
    const users = await kv.mget(userIds.map((id: string) => `users:${id}`));
    
    return c.json(users);
  } catch (error) {
    console.log('Error fetching organization users:', error);
    return c.json({ error: 'Failed to fetch users' }, 500);
  }
});

// Update user (admin only)
app.put("/make-server-3af6643f/users/:userId", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const currentUser = await kv.get(`users:${user.id}`);
    if (currentUser.role !== 'admin') {
      return c.json({ error: 'Forbidden - Admin only' }, 403);
    }
    
    const userId = c.req.param('userId');
    const updates = await c.req.json();
    const targetUser = await kv.get(`users:${userId}`);
    
    if (!targetUser) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    const updatedUser = {
      ...targetUser,
      ...updates,
      id: userId, // Don't allow changing ID
    };
    
    await kv.set(`users:${userId}`, updatedUser);
    
    return c.json({ success: true, user: updatedUser });
  } catch (error) {
    console.log('Error updating user:', error);
    return c.json({ error: 'Failed to update user' }, 500);
  }
});

// Delete user (admin only)
app.delete("/make-server-3af6643f/users/:userId", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const currentUser = await kv.get(`users:${user.id}`);
    if (currentUser.role !== 'admin') {
      return c.json({ error: 'Forbidden - Admin only' }, 403);
    }
    
    const userId = c.req.param('userId');
    
    // Prevent admin from deleting themselves
    if (userId === user.id) {
      return c.json({ error: 'Cannot delete your own account' }, 400);
    }
    
    const targetUser = await kv.get(`users:${userId}`);
    
    if (!targetUser) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    // Delete user from KV store
    await kv.del(`users:${userId}`);
    
    // Remove user from organization's users list
    if (targetUser.orgId) {
      const orgUsersKey = `orgs:${targetUser.orgId}:users`;
      const orgUsers = await kv.get(orgUsersKey) || [];
      const updatedOrgUsers = orgUsers.filter((id: string) => id !== userId);
      await kv.set(orgUsersKey, updatedOrgUsers);
    }
    
    // Delete user from Supabase Auth
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    const { error: deleteAuthError } = await supabaseAuth.auth.admin.deleteUser(userId);
    if (deleteAuthError) {
      console.log('Error deleting user from Supabase Auth:', deleteAuthError);
      // Continue even if auth deletion fails - user is already removed from KV
    }
    
    return c.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.log('Error deleting user:', error);
    return c.json({ error: 'Failed to delete user' }, 500);
  }
});

// ========== PROJECT ROUTES ==========

// Create project (admin only)
app.post("/make-server-3af6643f/projects", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const currentUser = await kv.get(`users:${user.id}`);
    if (currentUser.role !== 'admin') {
      return c.json({ error: 'Forbidden - Admin only' }, 403);
    }
    
    const { name, description, assignedUsers = [] } = await c.req.json();
    const projectId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const project = {
      id: projectId,
      name,
      description,
      orgId: currentUser.orgId,
      assignedUsers,
      createdAt: new Date().toISOString(),
      createdBy: user.id,
    };
    
    await kv.set(`projects:${projectId}`, project);
    
    // Add to org projects index
    const orgProjects = await kv.get(`org-projects:${currentUser.orgId}`) || [];
    await kv.set(`org-projects:${currentUser.orgId}`, [...orgProjects, projectId]);
    
    return c.json({ success: true, project });
  } catch (error) {
    console.log('Error creating project:', error);
    return c.json({ error: 'Failed to create project' }, 500);
  }
});

// Get all projects for user's organization
app.get("/make-server-3af6643f/projects", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const currentUser = await kv.get(`users:${user.id}`);
    if (!currentUser.orgId) {
      return c.json([]);
    }
    
    const projectIds = await kv.get(`org-projects:${currentUser.orgId}`) || [];
    const projects = await kv.mget(projectIds.map((id: string) => `projects:${id}`));
    
    // If staff, only return assigned projects
    if (currentUser.role === 'staff') {
      return c.json(projects.filter((p: any) => 
        p.assignedUsers.includes(user.id)
      ));
    }
    
    return c.json(projects);
  } catch (error) {
    console.log('Error fetching projects:', error);
    return c.json({ error: 'Failed to fetch projects' }, 500);
  }
});

// Update project (admin only)
app.put("/make-server-3af6643f/projects/:projectId", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const currentUser = await kv.get(`users:${user.id}`);
    if (currentUser.role !== 'admin') {
      return c.json({ error: 'Forbidden - Admin only' }, 403);
    }
    
    const projectId = c.req.param('projectId');
    const updates = await c.req.json();
    const project = await kv.get(`projects:${projectId}`);
    
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }
    
    const updatedProject = {
      ...project,
      ...updates,
      id: projectId,
    };
    
    await kv.set(`projects:${projectId}`, updatedProject);
    
    return c.json({ success: true, project: updatedProject });
  } catch (error) {
    console.log('Error updating project:', error);
    return c.json({ error: 'Failed to update project' }, 500);
  }
});

// Delete project (admin only)
app.delete("/make-server-3af6643f/projects/:projectId", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const currentUser = await kv.get(`users:${user.id}`);
    if (currentUser.role !== 'admin') {
      return c.json({ error: 'Forbidden - Admin only' }, 403);
    }
    
    const projectId = c.req.param('projectId');
    const project = await kv.get(`projects:${projectId}`);
    
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }
    
    await kv.del(`projects:${projectId}`);
    
    // Remove from org projects index
    const orgProjects = await kv.get(`org-projects:${currentUser.orgId}`) || [];
    await kv.set(`org-projects:${currentUser.orgId}`, 
      orgProjects.filter((id: string) => id !== projectId)
    );
    
    return c.json({ success: true });
  } catch (error) {
    console.log('Error deleting project:', error);
    return c.json({ error: 'Failed to delete project' }, 500);
  }
});

// ========== TIMESHEET ROUTES ==========

// Create timesheet entry
app.post("/make-server-3af6643f/timesheets", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const { projectId, taskName, startTime, endTime, duration, notes, beforePhotoUrl, afterPhotoUrl } = await c.req.json();
    const timesheetId = `timesheet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const timesheet = {
      id: timesheetId,
      userId: user.id,
      projectId,
      taskName,
      startTime,
      endTime,
      duration,
      notes,
      beforePhotoUrl: beforePhotoUrl || null,
      afterPhotoUrl: afterPhotoUrl || null,
      createdAt: new Date().toISOString(),
    };
    
    await kv.set(`timesheets:${timesheetId}`, timesheet);
    
    // Add to user timesheets index
    const userTimesheets = await kv.get(`user-timesheets:${user.id}`) || [];
    await kv.set(`user-timesheets:${user.id}`, [...userTimesheets, timesheetId]);
    
    return c.json({ success: true, timesheet });
  } catch (error) {
    console.log('Error creating timesheet entry:', error);
    return c.json({ error: 'Failed to create timesheet entry' }, 500);
  }
});

// Get user's timesheets
app.get("/make-server-3af6643f/timesheets", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');
    const projectId = c.req.query('projectId');
    
    const timesheetIds = await kv.get(`user-timesheets:${user.id}`) || [];
    let timesheets = await kv.mget(timesheetIds.map((id: string) => `timesheets:${id}`));
    
    // Filter by date range if provided
    if (startDate || endDate) {
      timesheets = timesheets.filter((t: any) => {
        const tDate = new Date(t.startTime);
        if (startDate && tDate < new Date(startDate)) return false;
        if (endDate && tDate > new Date(endDate)) return false;
        return true;
      });
    }
    
    // Filter by project if provided
    if (projectId) {
      timesheets = timesheets.filter((t: any) => t.projectId === projectId);
    }
    
    return c.json(timesheets);
  } catch (error) {
    console.log('Error fetching timesheets:', error);
    return c.json({ error: 'Failed to fetch timesheets' }, 500);
  }
});

// Get all timesheets for organization (admin only)
app.get("/make-server-3af6643f/organizations/:orgId/timesheets", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const currentUser = await kv.get(`users:${user.id}`);
    const orgId = c.req.param('orgId');
    
    if (currentUser.orgId !== orgId || currentUser.role !== 'admin') {
      return c.json({ error: 'Forbidden' }, 403);
    }
    
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');
    const userId = c.req.query('userId');
    const projectId = c.req.query('projectId');
    
    // Get all users in org
    const userIds = await kv.get(`org-users:${orgId}`) || [];
    
    // Get all timesheets for all users
    let allTimesheets: any[] = [];
    for (const uid of userIds) {
      const timesheetIds = await kv.get(`user-timesheets:${uid}`) || [];
      const timesheets = await kv.mget(timesheetIds.map((id: string) => `timesheets:${id}`));
      allTimesheets = [...allTimesheets, ...timesheets];
    }
    
    // Apply filters
    if (startDate || endDate) {
      allTimesheets = allTimesheets.filter((t: any) => {
        const tDate = new Date(t.startTime);
        if (startDate && tDate < new Date(startDate)) return false;
        if (endDate && tDate > new Date(endDate)) return false;
        return true;
      });
    }
    
    if (userId) {
      allTimesheets = allTimesheets.filter((t: any) => t.userId === userId);
    }
    
    if (projectId) {
      allTimesheets = allTimesheets.filter((t: any) => t.projectId === projectId);
    }
    
    return c.json(allTimesheets);
  } catch (error) {
    console.log('Error fetching organization timesheets:', error);
    return c.json({ error: 'Failed to fetch timesheets' }, 500);
  }
});

// Update timesheet entry
app.put("/make-server-3af6643f/timesheets/:timesheetId", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const timesheetId = c.req.param('timesheetId');
    const updates = await c.req.json();
    const timesheet = await kv.get(`timesheets:${timesheetId}`);
    
    if (!timesheet) {
      return c.json({ error: 'Timesheet not found' }, 404);
    }
    
    // Only allow user to update their own timesheets
    if (timesheet.userId !== user.id) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    
    const updatedTimesheet = {
      ...timesheet,
      ...updates,
      id: timesheetId,
      userId: user.id,
    };
    
    await kv.set(`timesheets:${timesheetId}`, updatedTimesheet);
    
    return c.json({ success: true, timesheet: updatedTimesheet });
  } catch (error) {
    console.log('Error updating timesheet entry:', error);
    return c.json({ error: 'Failed to update timesheet entry' }, 500);
  }
});

// Delete timesheet entry
app.delete("/make-server-3af6643f/timesheets/:timesheetId", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const timesheetId = c.req.param('timesheetId');
    const timesheet = await kv.get(`timesheets:${timesheetId}`);
    
    if (!timesheet) {
      return c.json({ error: 'Timesheet not found' }, 404);
    }
    
    // Only allow user to delete their own timesheets
    if (timesheet.userId !== user.id) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    
    await kv.del(`timesheets:${timesheetId}`);
    
    // Remove from user timesheets index
    const userTimesheets = await kv.get(`user-timesheets:${user.id}`) || [];
    await kv.set(`user-timesheets:${user.id}`, 
      userTimesheets.filter((id: string) => id !== timesheetId)
    );
    
    return c.json({ success: true });
  } catch (error) {
    console.log('Error deleting timesheet entry:', error);
    return c.json({ error: 'Failed to delete timesheet entry' }, 500);
  }
});

// ========== PHOTO UPLOAD ROUTES ==========

// Upload photo
app.post("/make-server-3af6643f/upload-photo", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const { photoData, fileName } = await c.req.json();
    
    // Decode base64 image
    const base64Data = photoData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    const filePath = `${user.id}/${Date.now()}_${fileName}`;
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });
    
    if (error) {
      console.log('Error uploading photo to storage:', error);
      return c.json({ error: 'Failed to upload photo' }, 500);
    }
    
    // Generate signed URL (valid for 1 year)
    const { data: signedData, error: signedError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, 31536000); // 1 year in seconds
    
    if (signedError) {
      console.log('Error creating signed URL:', signedError);
      return c.json({ error: 'Failed to create photo URL' }, 500);
    }
    
    return c.json({ 
      success: true, 
      url: signedData.signedUrl,
      path: filePath 
    });
  } catch (error) {
    console.log('Error during photo upload:', error);
    return c.json({ error: 'Photo upload failed' }, 500);
  }
});

Deno.serve(app.fetch);