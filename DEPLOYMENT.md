# 🚀 Production Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Setup ✅
- [ ] Copy `.env.example` to `.env`
- [ ] Configure Google OAuth Client ID
- [ ] Set up Gemini API Key (optional)
- [ ] Configure production environment variables in hosting platform

### 2. Code Quality ✅
- [ ] Run build: `npm run build`
- [ ] Fix all TypeScript errors
- [ ] Test in production mode: `npm run preview`

### 3. Security Review 🔒
- [ ] Verify `.env` is in `.gitignore`
- [ ] Ensure no API keys in source code
- [ ] Test PIN lock functionality
- [ ] Verify Google OAuth redirect URLs

### 4. Performance Testing ⚡
- [ ] Run Lighthouse audit (target: 90+ score)
- [ ] Test offline functionality
- [ ] Verify PWA installation
- [ ] Check bundle sizes (target: <500KB main chunk)

### 5. Cross-Browser Testing 🌐
- [ ] Chrome/Edge (Desktop + Mobile)
- [ ] Safari (Desktop + iOS)
- [ ] Firefox
- [ ] Test on slow 3G connection

---

## Deployment Options

### Option 1: Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**Environment Variables in Vercel:**
1. Go to Project Settings → Environment Variables
2. Add all variables from `.env.example`
3. Redeploy

### Option 2: Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Build and deploy
npm run build
netlify deploy --prod --dir=dist
```

**netlify.toml** (already configured):
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Option 3: GitHub Pages

```bash
# Add to package.json
"homepage": "https://yourusername.github.io/business-manager",

# Deploy
npm run build
npx gh-pages -d dist
```

### Option 4: Firebase Hosting

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login and init
firebase login
firebase init hosting

# Deploy
npm run build
firebase deploy
```

---

## Google OAuth Configuration

### 1. Create OAuth Client
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 Client ID
3. Application type: **Web application**

### 2. Configure Redirect URIs
Add these authorized redirect URIs:
```
https://yourdomain.com
https://yourdomain.com/
http://localhost:5173 (for development)
```

### 3. Configure Scopes
Required scopes:
- `https://www.googleapis.com/auth/userinfo.email`
- `https://www.googleapis.com/auth/userinfo.profile`
- `https://www.googleapis.com/auth/drive.file`
- `https://www.googleapis.com/auth/drive.appdata`

---

## Post-Deployment Verification

### Critical Tests

1. **PWA Installation**
   - Open app in Chrome
   - Click "Install" prompt
   - Verify app installs correctly
   - Test offline functionality

2. **Google Sign-In**
   - Click "Sign In" button
   - Complete OAuth flow
   - Verify user data syncs to Drive

3. **Core Functionality**
   - Create new sale
   - Add customer
   - Generate invoice PDF
   - Test offline → online sync

4. **Performance**
   ```bash
   # Run Lighthouse
   npx lighthouse https://yourdomain.com --view
   ```
   Target scores:
   - Performance: 90+
   - Accessibility: 95+
   - Best Practices: 95+
   - SEO: 90+

---

## Monitoring & Maintenance

### Performance Monitoring
The app includes built-in Web Vitals tracking:
- LCP (Largest Contentful Paint)
- CLS (Cumulative Layout Shift)
- INP (Interaction to Next Paint)

Check browser console for performance reports.

### Error Tracking
All errors are logged to IndexedDB audit logs. Access via:
1. Open app
2. Navigate to System Optimizer
3. View Audit Logs

### Optional: External Monitoring
Consider adding:
- **Sentry**: Error tracking
- **Google Analytics**: User behavior
- **LogRocket**: Session replay

---

## Backup Strategy

### User Data
- Stored in IndexedDB (local)
- Synced to Google Drive (cloud)
- Users can manually download backups

### Disaster Recovery
Users can restore from:
1. Google Drive sync files
2. Manual JSON backup files
3. Auto-generated checkpoints

---

## Rollback Plan

If issues occur in production:

```bash
# Vercel
vercel rollback

# Netlify
netlify rollback

# GitHub Pages
git revert HEAD
git push
npx gh-pages -d dist
```

---

## Support & Troubleshooting

### Common Issues

**1. "Sign-in failed"**
- Verify OAuth redirect URLs
- Check API credentials
- Ensure domain is allowed in Google Cloud Console

**2. "Sync not working"**
- Check Google Drive permissions
- Verify user has granted all scopes
- Test network connectivity

**3. "App not installing as PWA"**
- Ensure HTTPS is enabled
- Verify manifest.json is accessible
- Check service worker registration

**4. "Database error"**
- Clear browser storage
- Try incognito mode
- Check browser compatibility (requires IndexedDB support)

---

## Performance Optimization Tips

### 1. Image Optimization
Use the built-in System Optimizer to:
- Compress product images
- Reduce storage usage

### 2. Cache Strategy
Service worker caches:
- Static assets (1 year)
- API responses (5 minutes)
- Google Fonts (1 year)

### 3. Bundle Size
Current optimized sizes:
- Main bundle: ~215KB (Brotli: 28KB)
- Vendor: ~186KB (Brotli: 46KB)
- Total: ~6.7MB uncompressed

---

## Security Best Practices

1. **Never commit secrets**
   - `.env` is gitignored
   - Use platform environment variables

2. **PIN Protection**
   - SHA-256 hashed
   - Stored securely in IndexedDB

3. **Data Encryption**
   - AES-GCM encryption for sensitive data
   - PBKDF2 key derivation

4. **HTTPS Only**
   - Service workers require HTTPS
   - OAuth requires HTTPS in production

---

## Scaling Considerations

### Current Limits
- IndexedDB: ~50MB typical, browser-dependent
- Service Worker cache: ~500MB
- Google Drive: 15GB free

### When to Scale
If you need:
- Multi-user support → Add backend + database
- Cross-device sync → Enhance cloud sync
- Advanced analytics → Add data warehouse

---

## Contact & Support

For deployment issues, contact:
- Developer: cheeralakishore@gmail.com
- Documentation: Check README.md

---

**Last Updated**: December 2024
**App Version**: 1.2.0
