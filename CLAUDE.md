# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a comprehensive full-stack meditation and wellness application that:
- Generates unique AI-powered meditation texts using Claude API and Google Gemini
- Supports 5 meditation types (sleep, stress, focus, anxiety, energy) with professional coach personas
- Converts text to speech using ElevenLabs API and Google Cloud TTS
- Mixes speech with custom/default background nature sounds
- Processes audio with FFmpeg for optimal meditation tempo
- Supports 13 languages with automatic translation
- Features comprehensive journaling system with AI mood detection and grammar checking
- Includes AI Coach for addiction recovery support and crisis intervention
- Integrates Pi Network payments for credit purchases
- Provides community features, progress tracking, and emergency contact management

## Architecture

### Backend (Node.js/Express)
- **Server**: `/backend/server.js` - Express server on port 5002
- **Database**: MongoDB via Mongoose with collections for Users, Meditations, JournalEntries, AICoach sessions, Notifications
- **Audio Processing**: Uses FFmpeg for speech tempo adjustment and background music mixing
- **AI Services**: 
  - `aiCoachService.js` - Google Gemini for coaching, mood detection, grammar checking, crisis assessment
  - `translationService.js` - Multi-language support for meditation content
  - `googleTTSService.js` - Google Cloud TTS integration with quota management

#### Key Route Modules:
- `meditation.js` - Core meditation generation, TTS, audio processing, custom backgrounds
- `journal.js` - Journal entries with AI mood detection and trigger analysis
- `aiCoach.js` - AI coaching sessions, grammar checking, crisis intervention
- `auth.js` - User authentication, Pi Network integration
- `piPayments.js` - Pi Network payment processing for credits
- `userMeditations.js` - User meditation library management
- `notifications.js` - System notifications and alerts
- `addictions.js` - Addiction tracking and recovery support
- `emergencyContacts.js` - Crisis support contact management
- `community.js` - Community features and sharing

### Frontend (React)
- **Entry**: `/frontend/src/App.jsx` - Main app with wizard-style meditation creation
- **API Configuration**: `/frontend/src/config/api.js` - Dynamic API URL detection and endpoint definitions
- **Internationalization**: react-i18next supporting 13 languages with automatic translation
- **State Management**: React hooks with local storage persistence for user preferences

#### Core Components:
- `MeditationForm.jsx` - Multi-step meditation creation wizard
- `Journal.jsx` - Comprehensive journaling with grammar checking, voice-to-text, mood detection
- `AICoachChat.jsx` - Interactive AI coaching interface with crisis detection
- `GrammarChecker.jsx` - Real-time grammar and spelling analysis with error highlighting
- `PageHeader.jsx` - Page header with hamburger menu, language selector, tokens, and statistics access
- `BottomNavigation.jsx` - Main app navigation between meditation, journal, community, profile
- `BackgroundSlider.jsx` - Custom background audio upload and management
- `PiPaymentNew.jsx` - Pi Network payment integration for credit purchases

## Common Commands

### Initial Setup
```bash
npm run install-all      # Install all dependencies (root, backend, and frontend)
```

### Running the Full Application
```bash
npm start               # Start both backend (port 5002) and frontend (port 3000) in production mode
npm run dev             # Start both in development mode (backend with auto-restart on changes)
```

### Individual Development
```bash
npm run backend         # Start only the backend server
npm run frontend        # Start only the frontend React app
```

### Deployment Commands
```bash
npm run build           # Build frontend for production (sets GENERATE_SOURCEMAP=false)
npm run deploy          # Full deployment (build + copy + restart services) 
npm run deploy-quick    # Quick deployment (build + copy + restart frontend only)

# Manual deployment steps:
cd frontend && GENERATE_SOURCEMAP=false npm run build
cp -r frontend/build/* .
./service.sh restart    # Restart backend service
```

### Development and Debugging
```bash
# Backend development
cd backend && npm run dev     # Start with nodemon for auto-restart
./service.sh logs            # View live logs
./service.sh restart         # Restart after changes
./service.sh status          # Check service status

# Frontend development  
cd frontend && npm start      # Start React dev server on port 3000
npm run build                # Test production build locally

# Database debugging
# Connect to MongoDB to inspect collections directly
```

### Manual Setup (if needed)
```bash
cd backend && npm install && npm start    # Backend only
cd frontend && npm install && npm start   # Frontend only
```

## Key Configuration

### Environment Variables (backend/.env)
- `ELEVEN_LABS_API_KEY`: ElevenLabs API key for premium text-to-speech
- `ANTHROPIC_API_KEY`: Claude API key for AI text generation
- `GOOGLE_CLOUD_API_KEY`: Google Gemini API key for AI coaching and mood detection
- `MONGODB_URI`: MongoDB connection string
- `PI_API_KEY`: Pi Network API key for payment processing  
- `PORT`: Server port (defaults to 5002)

### Important Paths
- **FFmpeg**: System FFmpeg installation used for audio processing (Linux deployment)
- **Custom Backgrounds**: User-uploaded audio files stored in `/backend/custom-backgrounds/{userId}/`
- **System Backgrounds**: Default nature sounds in `/assets/` directory
- **User Meditations**: Generated meditation files in `/backend/user-meditations/{userId}/`
- **Frontend Build**: Production files copied from `/frontend/build/` to root directory

## Critical Architecture Notes

1. **Multi-AI Integration**: The app integrates multiple AI services:
   - **Claude (Anthropic)**: Primary meditation text generation and complex reasoning
   - **Google Gemini**: AI coaching, mood detection, grammar checking, crisis assessment
   - **ElevenLabs**: Premium TTS for high-quality meditation audio
   - **Google Cloud TTS**: Fallback TTS with quota management

2. **Systemd Service Management**: Backend runs as a systemd service named `meditations-backend`. Use `./service.sh restart` to restart after backend changes. Check logs with `./service.sh logs` or `journalctl --user -u meditations-backend -f`.

3. **Dynamic API Configuration**: Frontend automatically detects API URL based on current domain. Uses relative URLs (`/api/`) proxied through Nginx to backend on port 5002. Comment out `REACT_APP_API_URL` in frontend/.env for production.

4. **Audio Processing Pipeline**:
   - User input → AI text generation (Claude) → TTS (ElevenLabs/Google) → FFmpeg processing (tempo adjustment) → Background mixing → Final meditation audio
   - Custom backgrounds uploaded to user-specific directories, graceful fallback to system backgrounds

5. **Journal AI Features**:
   - **Real-time Grammar Checking**: Powered by Google Gemini with 13-language support
   - **Mood Detection**: AI analyzes journal text to detect emotional states
   - **Trigger Analysis**: Identifies addiction triggers and potential crisis situations
   - **Voice-to-Text**: Speech recognition for journal input

6. **Deployment Architecture**:
   - **Backend**: Systemd service serving on port 5002 (managed via `./service.sh`)
   - **Frontend**: Static files served from root directory via Nginx
   - **Build Process**: `npm run build` → `cp -r frontend/build/* .` → `./service.sh restart`
   - **Critical**: Always deploy after frontend changes or users see cached old versions

7. **Error Handling Patterns**:
   - **Background Files**: Graceful fallback to default backgrounds when custom files missing
   - **TTS Failures**: Automatic fallback from ElevenLabs to Google Cloud TTS  
   - **AI Service Failures**: Fallback responses prevent user-facing errors
   - **Credit System**: Prevents infinite API usage through user credit management

## Specialized Features

### AI Coaching System (`aiCoachService.js`)
- **Crisis Detection**: Automatically identifies and responds to mental health crises
- **Addiction Support**: Tracks recovery progress and provides intervention strategies  
- **Grammar Analysis**: Real-time spelling/grammar checking with error highlighting and nonsense detection
- **Mood Analytics**: Multi-dimensional mood detection from journal entries
- **Emergency Resources**: Location-based crisis resources and emergency contact management

### Professional Meditation Features
- **Dynamic Coach Personas**: AI adapts coaching style based on user preferences and meditation type
- **Advanced Audio Processing**: Custom tempo control (0.7x-1.2x) with ElevenLabs voice stability optimization
- **Intelligent Pausing**: Context-aware pause insertion for breathing space and reflection
- **Multi-language Generation**: Claude generates native content in 13 languages, not translations

### Pi Network Integration
- **Seamless Payments**: Direct Pi API integration for credit purchases without third-party dependencies
- **Auto-detection**: Automatic Pi Browser detection with fallback to traditional payment methods
- **Credit Management**: Real-time credit tracking with usage analytics and quota management
- **Payment Security**: Pi Network SDK handles authentication and payment verification

### Custom Background System
- **User Uploads**: Support for MP3/M4A custom background audio with metadata storage
- **Intelligent Fallbacks**: Graceful degradation when custom files are missing or corrupted
- **System Backgrounds**: Curated nature sounds (ocean, forest, rain, etc.) as defaults
- **Audio Processing**: FFmpeg normalization and mixing for consistent volume levels

## Database Architecture

### Key Collections
- **Users**: Authentication, preferences, credits, Pi Network integration
- **Meditations**: Generated content with audio files, custom backgrounds, sharing settings
- **JournalEntries**: User journals with AI-detected moods, triggers, and grammar analysis
- **AICoach**: Coaching sessions, interventions, progress tracking, crisis logs
- **Notifications**: System alerts, coaching prompts, emergency notifications
- **Addictions**: Recovery tracking with trigger identification and progress metrics

## Common Troubleshooting

### Frontend UI Issues
1. **Missing PageHeader/Hamburger Menu**:
   - Check that PageHeader CSS is present in `/frontend/src/styles/globals.css`
   - Required styles: `.page-header`, `.hamburger-menu-button`, `.hamburger-icon`
   - After CSS changes: rebuild frontend and redeploy static files
   - PageHeader component should be imported and used in main page components

2. **CSS Styles Missing After Build**:
   - Verify CSS is added to the source file in `/frontend/src/styles/globals.css`
   - Rebuild with `GENERATE_SOURCEMAP=false npm run build`
   - Copy built files: `cp -r frontend/build/* .`
   - Check that new CSS hash is reflected in `index.html` and `asset-manifest.json`

3. **Components Not Rendering**:
   - Check browser console for React errors and component warnings
   - Verify component imports and prop passing in parent components
   - Ensure user authentication state is properly passed to components requiring auth

4. **React Build Cache Issues**:
   - If build hash doesn't update despite code changes, clear build cache:
   - Delete `node_modules/.cache/` directory: `rm -rf node_modules/.cache/`
   - Use cache-busting environment variables in `.env.local`:
     ```
     FAST_REFRESH=false
     GENERATE_SOURCEMAP=false
     DISABLE_ESLINT_PLUGIN=true
     TSC_COMPILE_ON_ERROR=true
     REACT_APP_CACHE_BUST=true
     ```
   - Build with: `GENERATE_SOURCEMAP=false npm run build`
   - Deploy with: `cp -r frontend/build/* .`
   - Verify new hash in `index.html` (should change from previous deployment)

## Recent Updates and Status

### Enhanced Insights Dashboard Progress Bar (August 2025)
- ✅ **Issue**: "Loading... Enhanced Insights" text needed replacement with progress bar
- ✅ **Solution**: Implemented animated progress bar with brain emoji and percentage display
- ✅ **Implementation**: 
  - Added `loadingProgress` state with animation timers (20% → 50% → 75% → 90%)
  - Progress bar with gradient fill, shimmer animation, and pulsing brain emoji
  - CSS classes: `.brain-emoji`, `.simple-progress-bar`, `.progress-fill`, `.progress-text`
  - Added to both component styled-jsx and `/frontend/src/styles/globals.css` as fallback
- ✅ **Deployment**: Successfully deployed with new CSS hash `main.db6f7019.css`
- ✅ **Files Modified**:
  - `/frontend/src/components/EnhancedInsightsDashboard.jsx` - Added progress bar logic and CSS
  - `/frontend/src/styles/globals.css` - Added progress bar CSS classes as fallback
- ✅ **Cache Issues Resolved**: Used cache-busting techniques to ensure new build deployment

### React Import/Export Issues - Final Resolution (August 2025)
- ⚠️ **Issue**: React minified error #130 persisted despite multiple fix attempts
- 🔍 **Root Cause Analysis**: 
  - **Complex Component**: EnhancedInsightsDashboard component (1777+ lines) caused build conflicts
  - **Webpack Build Issues**: Even simplified versions triggered React error #130
  - **Cache Persistence**: Build hashes not updating despite code changes
  - **Dependency Conflicts**: styled-jsx or other CSS-in-JS patterns may be incompatible with current build setup
- ✅ **Final Solution**: **Component Removal and App Restoration**
  - **Removed Component**: Deleted `/frontend/src/components/EnhancedInsightsDashboard.jsx` entirely
  - **Reverted Integration**: Removed imports from ProfileContainer.jsx and PageHeader.jsx
  - **Restored Stability**: App now using stable `main.stable.js` version
  - **CSS Preserved**: Progress bar CSS classes remain in `main.db6f7019.css` for future use

### Progress Bar Implementation Status
- ❌ **EnhancedInsightsDashboard**: Removed due to React build conflicts
- ✅ **CSS Classes Available**: Progress bar styles (.brain-emoji, .simple-progress-bar, .progress-fill, .progress-text) are in globals.css
- ✅ **Alternative Implementation**: Progress bar can be implemented directly in existing components without complex dashboard

### Critical Lessons Learned
- **Build Stability First**: Never compromise core app functionality for new features
- **Incremental Development**: Large components should be built incrementally, not deployed as monoliths  
- **React Error #130**: Often caused by invalid element types from complex components, not just import/export issues
- **CSS-in-JS Limitations**: styled-jsx in large components may cause webpack build conflicts
- **Testing Strategy**: Test components in isolation first, then integrate gradually

### Current Deployment Status - EMERGENCY REVERT
- **Frontend CSS Hash**: `main.75910e28.css` - ⚠️ **ORIGINAL STABLE VERSION**
- **Frontend JS Hash**: `main.stable.js` - ⚠️ **ORIGINAL STABLE VERSION** 
- **Issue**: React error #130 persists in ALL new builds (main.0425538e.js)
- **Root Cause**: Unknown - even clean builds without EnhancedInsightsDashboard trigger React error #130
- **Website Status**: ✅ **FULLY STABLE** using original known-working files
- **Progress Bar**: Not available - reverted to pre-implementation state

### Critical Issue Analysis
- ❌ **ALL New Builds Fail**: Every npm run build creates files that cause React error #130
- ❌ **Build System Issue**: Problem is deeper than individual components 
- ❌ **Cache Issues**: Even with cleared cache, new builds are unstable
- ✅ **Original Files Work**: Only `main.stable.js` + `main.75910e28.css` combination is stable

### Immediate Priority
🚨 **DO NOT** attempt new builds until root cause of React error #130 is identified
🚨 **DO NOT** modify any components that require rebuilding
🚨 **KEEP** app on stable version (`main.stable.js` + `main.75910e28.css`)

### Recommended Next Steps for Progress Bar
1. **Simple Implementation**: Add progress bar directly to existing loading states (e.g., meditation generation)
2. **Existing Components**: Use progress bar CSS in ProfileContainer or Statistics components
3. **Avoid Complex Components**: Don't create large dashboard components until build system is more stable
4. **Test Incrementally**: Create minimal components and test thoroughly before expanding