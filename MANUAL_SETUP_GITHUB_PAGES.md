# 🔧 MANUAL SETUP GITHUB PAGES - PANDUAN LENGKAP

## 📋 Quick Setup Guide (3 Langkah Sederhana)

### ⚠️ IMPORTANT - HARUS DILAKUKAN SEKALI!

Setelah push ke GitHub, GitHub Actions akan coba deploy otomatis tetapi mungkin gagal karena **belum di-configure** di repository settings.

Ikuti langkah berikut untuk enable GitHub Pages:

---

## ✅ STEP 1: Enable GitHub Pages di Repository Settings

### Langkah-langkah:

1. **Buka Repository GitHub:**
   ```
   https://github.com/nassrudin/petainteraktif
   ```

2. **Klik Tab "Settings":**
   - Di menu horizontal atas (Issues | Pull Requests | Codespaces | Security | Settings)

3. **Di Sidebar Kiri, Klik "Pages":**
   - Scroll down sampai menemukan bagian "GitHub Pages"

4. **Configure Source:**
   ```
   Build and deployment → Source: GitHub Actions
   ```

5. **Pilih Workflow:**
   ```
   Deploy to GitHub Pages
   ```

6. **Click "Save"**

✅ **Done!** Sekarang workflow akan otomatis run setiap ada push ke main

---

## ✅ STEP 2: Allow GitHub Actions Permission

### Kenapa Perlu?

GitHub perlu permission untuk deploy ke Pages. Defaultnya diblokir untuk keamanan.

### Cara Set:

1. Buka **Settings** → **Actions** → **General**

2. Scroll ke section **"Workflow permissions"**

3. Pilih:
   ```
   ✓ Read and write permissions
   ```

4. Click **Save**

---

## ✅ STEP 3: Wait for First Deployment

### Monitor Progress:

1. **Go to Actions tab:**
   ```
   https://github.com/nassrudin/petainteraktif/actions
   ```

2. **Select "Deploy to GitHub Pages" workflow:**
   - Klik workflow yang paling baru

3. **Watch it run:**
   - Should complete in 3-5 minutes
   - Green checkmark = Success ✅
   - Red X = Failed ❌ (check logs)

### If Successful:

You'll see at bottom of workflow page:
```
This deployment will automatically update your GitHub Pages site:
https://nassrudin.github.io/petainteraktif/
```

Click that URL to verify site is live! 🎉

---

## 🔍 VERIFY SITE IS LIVE

### Check Live URL:

Visit: `https://nassrudin.github.io/petainteraktif/`

Should see:
- App homepage
- Student entry form
- Beautiful UI with gradients

### Test Functionality:

1. **Student Entry Form:**
   - Fill name, class, absence number
   - Should save progress

2. **Navigation:**
   - All buttons work
   - Modal opens correctly

3. **Admin Login (optional):**
   - Try admin credentials if you have them
   - Dashboard should load

---

## 🐛 TROUBLESHOOTING

### Issue 1: Build Fails / Error

**Check logs:**
```
Actions → Deploy to GitHub Pages → Latest Run → Scroll to see error
```

**Common causes:**

| Error Message | Solution |
|--------------|----------|
| "Module not found" | Run `npm install` locally first |
| "Syntax error" | Check TypeScript compilation |
| "Build failed" | Run `npm run build` locally to debug |

**Quick Fix:**
```bash
npm run build
# Check console for errors
# Fix issues locally
git add . && git commit -m "fix: resolve build errors"
git push
```

---

### Issue 2: Site Shows 404 Not Found

**Possible Reasons:**

1. **Site not built yet**
   - Wait 3-5 minutes after last commit
   - Check Actions tab for successful build

2. **Wrong base path**
   - Check `vite.config.ts`:
     ```typescript
     export default defineConfig({
       base: './',  // ← Must be this
       plugins: [react(), tailwindcss()],
     });
     ```

3. **Cache issue**
   - Hard refresh browser: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
   - Clear cache: Ctrl+Shift+Delete

**Fix:**
```bash
# Rebuild and redeploy
git push origin main --force
```

---

### Issue 3: Styles/Javascript Not Loading

**Symptoms:**
- Page loads but looks plain (no CSS)
- Buttons don't respond
- Console shows JS errors

**Solutions:**

1. **Check Network Tab:**
   - Open DevTools (F12)
   - Go to Network tab
   - Refresh page
   - Look for failed requests (red)

2. **If CSS/JS files return 404:**
   - Files might be in wrong location
   - Check `dist/` folder after build

3. **Quick Fix:**
   ```bash
   # Rebuild everything
   npm run build
   npm run preview
   # Verify works locally first
   git add . && git commit -m "chore: rebuild for production"
   git push
   ```

---

### Issue 4: Workflow Never Runs

**Check:**

1. **Branch Protection:**
   - Settings → Branches → Branch protection rules
   - Ensure `main` branch allows automatic workflows

2. **Workflow Disabled:**
   - Actions tab → Toggle "Enable Actions" ON (if visible)

3. **Webhook Missing:**
   - Settings → Webhooks (verify connected)

**Manual Trigger:**
```
Actions tab → Select workflow → Run workflow button
```

---

## 📊 EXPECTED TIMELINE

| Event | When | Duration |
|-------|------|----------|
| Push to main | You click Commit | Instant |
| Workflow triggered | ~1 minute later | < 1 min |
| Build starts | Workflow triggers build job | Immediate |
| Build completes | Install deps + build | 2-4 minutes |
| Deploy to Pages | After successful build | < 1 minute |
| Site live | DNS propagation | 1-5 minutes |
| **Total time** | From push to live | **~5-10 minutes** |

---

## ✅ SUCCESS CHECKLIST

After following all steps above, verify:

- [ ] GitHub Pages enabled in Settings
- [ ] Workflow permissions set to R/W
- [ ] No red X in Actions tab (should be green checkmarks)
- [ ] Visit `https://nassrudin.github.io/petainteraktif/` works
- [ ] App loads with proper styling (gradients, animations)
- [ ] Student entry form functional
- [ ] PDF export button present
- [ ] Mobile responsive (test on phone/tablet)
- [ ] All navigation works

---

## 🆘 STILL HAVING ISSUES?

### Get Debug Info:

Run these commands locally:

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Check build
npm run build

# See what's in dist/
cd dist
ls -la  # Windows: dir

# Preview build
npm run preview
```

### Check Your Files:

Ensure these exist:
- [x] `package.json` 
- [x] `vite.config.ts`
- [x] `.github/workflows/deploy.yml`
- [x] `src/main.tsx`
- [x] `index.html`

### Check Workflow File Content:

Open `.github/workflows/deploy.yml` in GitHub file browser. Verify it has:

```yaml
on:
  push:
    branches: [main]
    
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
      
  deploy:
    needs: build
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
```

---

## 🎯 ALTERNATIVE DEPLOYMENT OPTIONS

If GitHub Pages continues to have issues:

### Option A: Netlify (Recommended Alternative)

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build
npm run build

# Deploy
netlify deploy --prod
```

### Option B: Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Option C: Firebase Hosting

```bash
# Install Firebase tools
npm install -g firebase-tools

# Initialize
firebase init hosting

# Build and deploy
npm run build
firebase deploy
```

---

## 📞 GET HELP

### Resources:

- **GitHub Pages Docs**: https://pages.github.com/
- **GitHub Actions Docs**: https://docs.github.com/en/actions
- **Vite Deployment**: https://vitejs.dev/guide/static-deploy.html
- **Tailwind CSS Docs**: https://tailwindcss.com/docs/installation

### Contact:

- Create GitHub Issue: https://github.com/nassrudin/petainteraktif/issues
- Email developer
- Check documentation files in repo

---

## 🏁 FINAL REMINDER

After successful deployment:

1. **Test thoroughly** - All features working?
2. **Share URL** - https://nassrudin.github.io/petainteraktif/
3. **Monitor** - Watch for any user-reported issues
4. **Update regularly** - Push improvements when ready

**Happy Deploying!** 🚀

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Status**: ✅ Ready for Manual Setup
