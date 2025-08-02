# Nginx Setup Instructions voor Meditation App

## 🎯 Doel
Migreren van Apache naar Nginx voor betere performance en lagere resource usage.

## 📋 Huidige Situatie
- **Apache2**: Actief op port 80 (97.9MB memory)
- **Backend**: Node.js API op port 5003 (PM2)
- **Frontend**: React build files in `/var/www/vhosts/pihappy.me/meditations.pihappy.me/`

## 🚀 Setup Stappen

### Stap 1: Kopieer Nginx Configuratie
```bash
sudo cp /var/www/vhosts/pihappy.me/meditations.pihappy.me/nginx-meditation-app.conf /etc/nginx/sites-available/meditation-app
```

### Stap 2: Test Configuratie Syntax
```bash
sudo nginx -t
```

### Stap 3: Enable Site
```bash
sudo ln -sf /etc/nginx/sites-available/meditation-app /etc/nginx/sites-enabled/meditation-app
```

### Stap 4: Disable Default Site
```bash
sudo rm -f /etc/nginx/sites-enabled/default
```

### Stap 5: Add Rate Limiting (optioneel)
Voeg toe aan `/etc/nginx/nginx.conf` in de `http` block:
```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
```

### Stap 6: Start Nginx Parallel
```bash
# Test de configuratie
sudo nginx -t

# Start Nginx (parallel aan Apache)
sudo systemctl start nginx
```

## 🔧 Testing Phase

### Controleer Services
```bash
sudo systemctl status apache2
sudo systemctl status nginx
netstat -tlnp | grep :80
```

### Test de App
1. Open: `http://meditations.pihappy.me`
2. Test functionaliteiten:
   - Login (traditional + Pi Network)
   - Meditation generation
   - Journal entries
   - Audio playback
   - Language switching

## 🚀 Go-Live (na succesvolle test)

### Stop Apache
```bash
sudo systemctl stop apache2
sudo systemctl disable apache2
```

### Enable Nginx Autostart
```bash
sudo systemctl enable nginx
```

## 📊 Verwachte Verbeteringen

### Performance
- **Memory**: 97.9MB → ~15-30MB (70% reductie)
- **Static files**: 20-40% sneller
- **Concurrent users**: Veel hoger
- **API proxy**: Betere response times

### Security
- **Rate limiting**: DoS protection
- **Security headers**: XSS, CSRF protection
- **File access**: Betere .env/.git blocking

### Caching
- **Static assets**: 1 jaar browser cache
- **API responses**: Intelligent proxy caching
- **Gzip**: Automatic compression

## 🔄 Rollback Plan (indien nodig)
```bash
# Stop Nginx
sudo systemctl stop nginx
sudo systemctl disable nginx

# Start Apache
sudo systemctl start apache2
sudo systemctl enable apache2
```

## 📁 Configuratie Details

### Server Block Features
- ✅ **React SPA**: Proper routing met fallback naar index.html
- ✅ **API Proxy**: Backend requests naar port 5003
- ✅ **Static Caching**: 1 jaar voor assets, no-cache voor index.html
- ✅ **Gzip**: Optimale compressie voor JS/CSS/JSON
- ✅ **Security**: Headers + file access blocking
- ✅ **Audio Files**: Proper MIME types voor meditation audio
- ✅ **CORS**: API toegang voor frontend
- ✅ **Logging**: Dedicated log files

### Pad Configuratie
- `/` → React app (index.html fallback)
- `/api/*` → Node.js backend (port 5003)
- `/static/*` → Static assets (React build)
- `/assets/*` → Audio files (meditation/journal)

## 💡 Tips
- Monitor logs: `tail -f /var/log/nginx/meditation-app-*.log`
- Check performance: `htop` en memory usage
- Test alle Pi Network functionaliteit grondig
- Controleer audio playback op mobiel

## ⚠️ Important Notes
- Zorg dat backend (PM2) draait op port 5003
- Test Pi Network login grondig (recent timeout fixes)
- Controleer CORS headers voor API access
- Monitor resource usage na migration