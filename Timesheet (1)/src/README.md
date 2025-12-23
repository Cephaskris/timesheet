# GrangerPR Timesheet

A comprehensive timesheet application for organizations to track employee work hours with photo documentation features.

## Features

- 🔐 **Role-based Authentication**: Separate interfaces for Admin and Staff users
- 🏢 **Organization Management**: Create and manage organizations with unique invite codes
- 👥 **User Management**: Admins can manage staff members and their roles
- 📋 **Project & Task Management**: Create projects, assign tasks, and track time against them
- ⏱️ **Time Tracking**: 
  - Built-in timers for real-time tracking
  - Manual time entry with date/time pickers
  - Weekly timesheet view with horizontal day layout
- 📸 **Photo Documentation**: Upload before/after work photos for accountability
- 📊 **Comprehensive Reporting**: 
  - Analytics dashboard with charts
  - Filtering by date range, project, and user
  - CSV export functionality
- 🎨 **Modern Glassmorphism Design**: 
  - Deep purple gradient animated backgrounds
  - Glass effects with backdrop blur
  - Brand colors: #6A0DAD (Purple) and #F2994A (Orange)
- 📱 **Fully Responsive**: Mobile-first design with adaptive layouts
- 🔄 **Real-time Synchronization**: Live updates using Supabase subscriptions

## Tech Stack

- **Frontend**: React + TypeScript
- **Backend**: Supabase
  - Authentication
  - PostgreSQL Database
  - Storage for photo uploads
  - Real-time subscriptions
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS v4.0
- **Charts**: Recharts
- **Icons**: Lucide React

## Project Structure

```
/
├── App.tsx                          # Main application entry point
├── components/
│   ├── admin/
│   │   ├── AdminDashboard.tsx      # Admin dashboard overview
│   │   ├── UserManagement.tsx      # Manage users
│   │   ├── ProjectManagement.tsx   # Manage projects and tasks
│   │   ├── ReportsView.tsx         # Reporting and analytics
│   │   └── InviteCodeDialog.tsx    # Generate invite codes
│   ├── staff/
│   │   ├── StaffDashboard.tsx      # Staff dashboard
│   │   ├── TimeEntryForm.tsx       # Create new time entries
│   │   ├── TimeEntryList.tsx       # List of time entries
│   │   ├── WeeklyTimesheetView.tsx # Weekly view with horizontal days
│   │   └── PhotoUpload.tsx         # Photo upload component
│   ├── auth/
│   │   ├── LoginForm.tsx           # Login interface
│   │   ├── SignupForm.tsx          # Signup with invite code
│   │   └── JoinOrganization.tsx    # Join org with invite code
│   └── ui/                         # shadcn/ui components
├── lib/
│   └── supabase.ts                 # Supabase client configuration
└── styles/
    └── globals.css                 # Global styles and design tokens

```

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A Supabase account

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR-USERNAME/grangerpr-timesheet.git
cd grangerpr-timesheet
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API to find your project URL and anon key
3. Set up the database tables (see Database Schema below)
4. Enable Storage and create a bucket named `work-photos`

### 4. Configure Environment Variables

Create a `.env` file in the root directory (this will be ignored by git):

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. Run the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Database Schema

The application requires the following Supabase tables:

### `organizations`
- `id` (uuid, primary key)
- `name` (text)
- `created_at` (timestamp)

### `users`
- `id` (uuid, primary key, references auth.users)
- `email` (text)
- `full_name` (text)
- `role` (text: 'admin' or 'staff')
- `organization_id` (uuid, references organizations)
- `created_at` (timestamp)

### `projects`
- `id` (uuid, primary key)
- `name` (text)
- `description` (text)
- `organization_id` (uuid, references organizations)
- `created_at` (timestamp)

### `tasks`
- `id` (uuid, primary key)
- `name` (text)
- `description` (text)
- `project_id` (uuid, references projects)
- `created_at` (timestamp)

### `time_entries`
- `id` (uuid, primary key)
- `user_id` (uuid, references users)
- `task_id` (uuid, references tasks)
- `start_time` (timestamp)
- `end_time` (timestamp)
- `duration` (integer, minutes)
- `notes` (text)
- `before_photo_url` (text)
- `after_photo_url` (text)
- `created_at` (timestamp)

### `invite_codes`
- `id` (uuid, primary key)
- `code` (text, unique)
- `organization_id` (uuid, references organizations)
- `created_by` (uuid, references users)
- `expires_at` (timestamp)
- `max_uses` (integer)
- `current_uses` (integer)
- `is_active` (boolean)
- `created_at` (timestamp)

## Usage

### For Administrators

1. **Sign up** as an admin (first user creates an organization)
2. **Generate invite codes** from the Admin Dashboard
3. **Manage users** - view and manage staff members
4. **Create projects and tasks** for staff to track time against
5. **View reports** - see analytics, export data to CSV

### For Staff

1. **Sign up** using an invite code from your organization
2. **Create time entries** using the timer or manual entry
3. **Upload photos** before and after work sessions
4. **View your timesheet** in the weekly view with horizontal days
5. **Track your hours** across different projects and tasks

## Brand Guidelines

- **Primary Color**: #6A0DAD (Purple) - Used for primary buttons and key actions
- **Secondary Color**: #F2994A (Orange) - Used for secondary buttons and accents
- **Design Style**: Glassmorphism with deep purple gradients and backdrop blur effects
- **Typography**: Default system font stack with proper hierarchy

## Features in Detail

### Weekly Timesheet View
- Horizontal day layout showing the current week
- "New time entry" form prominently displayed
- Today's tasks and entries listed at the bottom
- Glass effect cards with smooth animations

### Real-time Sync
- All major components sync in real-time
- Changes are immediately reflected across all users
- Uses Supabase subscriptions for live updates

### Photo Documentation
- Upload before/after work photos
- Stored securely in Supabase Storage
- Linked to specific time entries

### Reporting & Analytics
- Visual charts using Recharts
- Filter by date range, project, and user
- Export data to CSV format
- Overview statistics and trends

## Security Considerations

⚠️ **Important**: This application is designed for internal organizational use and is not intended for collecting Personally Identifiable Information (PII) or securing highly sensitive data.

- Authentication handled by Supabase Auth
- Row Level Security (RLS) policies should be enabled on all tables
- Photos stored in private Supabase Storage buckets
- Environment variables keep API keys secure

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is private and proprietary to GrangerPR.

## Support

For issues, questions, or support, please contact the development team.

---

Built with ❤️ using React, Supabase, and modern web technologies.
