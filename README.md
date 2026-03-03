# DashLink

A modern, collaborative workspace platform for organizing and managing data with real-time collaboration features and AI-powered insights.

![Angular](https://img.shields.io/badge/Angular-18.2-DD0031?logo=angular)
![Firebase](https://img.shields.io/badge/Firebase-10.0-FFCA28?logo=firebase)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript)
![PrimeNG](https://img.shields.io/badge/PrimeNG-18.0-007ACC)

## Overview

DashLink combines personal data organization with collaborative workspaces, offering both individual and team productivity tools in one unified platform. Whether you're managing personal collections or working with teams on shared projects, DashLink provides the structure and intelligence you need.

## Key Features

### Personal Dashboard
- **Hierarchical Collections**: Organize data in nested collections with unlimited depth
- **Custom Nodes**: Create nodes with flexible field types (text, URL, number, date, image, ratings, etc.)
- **Smart Search**: Global search across all collections with real-time filtering
- **Real-time Sync**: Changes instantly sync across all devices

### Collaborative Workspaces
- **Team Collaboration**: Create shared workspaces with invite-based member management
- **Custom Schemas**: Define workspace-specific field structures for consistency
- **Role Management**: Owner and member roles with granular permissions
- **Activity Tracking**: Monitor member contributions and workspace statistics
- **Member Limits**: Set team size caps (2-32 members) per workspace

### AI-Powered Analysis
- **Workspace Insights**: AI-driven analysis of team performance and contributions
- **Rule Compliance**: Automatic evaluation of workspace rules and penalties
- **Custom Questions**: Ask specific questions about your workspace data
- **Member Analytics**: Per-member analysis with warnings, recommendations, and penalties
- **Team Health Score**: Overall workspace health metrics and actionable suggestions
- **Usage Tracking**: Monitor AI analysis calls per user (powered by Google Gemini)

### Modern UI/UX
- **Dark Theme**: Sleek, modern interface with green accent colors
- **Responsive Design**: Optimized for desktop, tablet, and mobile
- **PrimeNG Components**: Professional UI components with consistent styling
- **Image Fallbacks**: Themed SVG placeholders for broken images
- **Smooth Animations**: Polished hover effects and transitions

## Usage Guide

### Getting Started

#### 1. Authentication
- **Sign Up**: Create an account with email/password or Google OAuth
- **Login**: Access your dashboard with your credentials
- **Secure**: All data is protected with Firebase Authentication

#### 2. Personal Collections

**Create a Collection:**
1. Click **"+ Collection"** on the dashboard
2. Enter a name and optional description
3. Collections can be nested to any depth

**Add Nodes to Collections:**
1. Open a collection
2. Click **"+ Node"**
3. Fill in node details (name, description)
4. Add custom fields:
   - Text, Long Text, Number
   - URL, Email, Phone
   - Date, Date & Time
   - Image URL, Color, Rating
   - Checkbox, Dropdown

**Search Your Data:**
- Use the search bar at the top
- Toggle between "All Collections" and "Current Collection" scope
- Results update in real-time as you type

**Manage Collections:**
- Edit or delete collections using the **⋮** menu
- Navigate using breadcrumbs
- View nodes as cards with preview thumbnails

#### 3. Workspaces

**Create a Workspace:**
1. Click **"+ Workspace"** on the dashboard
2. **Basic Info Step**:
   - Name and description
   - Member limit (2-32)
   - Google Gemini API key (optional, for AI analysis)
3. **Metadata Step**:
   - Goal: Define the workspace purpose
   - Rules: Set guidelines for members
   - Duration: Timeline or deadline
   - Penalty: Consequences for non-compliance
   - Category and Tags
4. **Schema Step** (Optional):
   - Toggle "Use Custom Schema"
   - Define required fields for all workspace nodes
   - Set field types and mark mandatory fields
   - Reorder fields using up/down arrows

**Invite Members:**
1. Open workspace → **Settings**
2. Go to **Invite** tab
3. Share the invite code or link with teammates
4. Members join by entering the code from their dashboard

**Manage Workspace:**
- **Overview**: View stats, member contributions, and all nodes
- **Settings**: 
  - **Info**: Edit workspace details, member limit, or delete
  - **Members**: View active members, ban/unban users
  - **Invite**: Regenerate invite code if needed
- **Collections & Nodes**: Same as personal dashboard, but shared with team

**Member Roles:**
- **Owner**: Full control (edit, delete, ban members)
- **Member**: Can add/edit/delete nodes and collections

#### 4. AI Workspace Analysis

**Prerequisites:**
- Workspace owner must add a Google Gemini API key
- Get a free API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- Add key in **Workspace Settings → Info tab → Google Gemini API Key**

**Run Analysis:**
1. Open workspace → Click **Overview**
2. Click **"AI Analysis"** button (sparkle icon)
3. Review the data being analyzed:
   - Workspace metadata (goal, rules, penalties)
   - All members and their contribution percentages
   - Node statistics
4. (Optional) Add a custom question in the text area:
   - "Who needs more support?"
   - "Is the workload balanced?"
   - "Which members are most active?"
5. Click **"Analyze with AI"**

**Understanding Results:**
- **Workspace Health**: 0-100 score with summary
- **Member Analysis**: Per-member breakdown with:
  - Contribution analysis
  - Warnings (e.g., inactive, low contribution)
  - Penalties (if workspace rules are violated)
  - Personalized recommendations
- **Team Insights**:
  - Strengths: What's working well
  - Concerns: Areas needing attention
  - Suggestions: Actionable improvements
- **Custom Question Answer**: AI's response to your specific question

**Usage Tracking:**
- Each analysis run is tracked per user
- View total analysis count at the bottom of the dialog
- No daily limits (you control your own API key)

#### 5. Best Practices

**For Personal Use:**
- Use collections to group related data (e.g., "Work Links", "Recipes")
- Add image URLs to nodes for visual previews
- Use custom fields to capture specific data (ratings, dates, etc.)
- Leverage search when collections grow large

**For Team Workspaces:**
- Set clear workspace goals and rules upfront
- Use custom schemas for consistency across team nodes
- Define meaningful penalties for rule compliance
- Run AI analysis monthly to track team health
- Use member limit to keep teams focused and manageable
- Ban inactive members to maintain data quality

**For AI Analysis:**
- Write specific custom questions for targeted insights
- Ensure workspace rules and penalties are clearly defined
- Run analysis after significant team changes
- Share AI insights with the team for transparency

## Tech Stack

- **Frontend**: Angular 18 (Standalone Components)
- **Backend**: Firebase (Firestore, Authentication, Hosting)
- **UI Library**: PrimeNG 18 (Lara Dark Theme)
- **Styling**: SCSS + PrimeFlex utilities
- **State Management**: RxJS Observables
- **AI Integration**: Google Gemini 1.5 Flash API
- **TypeScript**: Strict mode with full type safety

## Setup & Development

### Prerequisites
- Node.js 20.19.2+
- npm
- Firebase account
- (Optional) Google Gemini API key for AI features

### Installation

```bash
# Clone repository
git clone https://github.com/your-username/DashLink.git
cd DashLink

# Install dependencies
npm install

# Configure Firebase
# Create src/environments/environment.ts with your Firebase config

# Deploy Firestore rules and indexes
firebase deploy --only firestore

# Run development server
ng serve
```

Navigate to `http://localhost:4200/`

### Building for Production

```bash
ng build
firebase deploy
```

## Security

- **Authentication**: Firebase Auth with email/password and Google OAuth
- **Authorization**: Firestore security rules enforce data access
- **Personal Data**: Users can only access their own collections and nodes
- **Workspace Data**: Members can only access workspaces they've joined
- **AI Usage**: Usage tracking documents are user-specific (userId prefix)
- **API Keys**: Workspace owners manage their own Gemini keys (not shared)

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details

## Support

For issues, feature requests, or questions, please open an issue on the GitHub repository.

---

**Built with ❤️ using Angular and Firebase**
