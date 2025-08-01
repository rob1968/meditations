# Pi Payments Setup Instructions

## Step 1: Add Wallet Private Seed
Once you get your wallet private seed from Pi Developer Portal:

```bash
# Edit the .env file:
nano /var/www/vhosts/pihappy.me/meditation.pihappy.me/backend/.env

# Replace this line:
PI_WALLET_PRIVATE_SEED="S_YOUR_WALLET_PRIVATE_SEED_HERE"

# With your actual seed:
PI_WALLET_PRIVATE_SEED="S_YOUR_ACTUAL_SEED_FROM_PI_DEVELOPER_PORTAL"
```

## Step 2: Restart Backend
```bash
cd /var/www/vhosts/pihappy.me/meditation.pihappy.me/backend
pkill -f "node server.js"
nohup node server.js > server.log 2>&1 &
```

## Step 3: Verify Setup
Check the logs:
```bash
tail -f server.log
```

You should see:
```
✅ MongoDB connected
✅ Pi Payment Service initialized
```

## Step 4: Test Payment Flow
1. Go to https://meditation.pihappy.me
2. Login or create account
3. Go to Credits section
4. Click "π Buy Credits"
5. Select a credit package
6. Complete Pi payment

## Troubleshooting
- If "Pi Payment Service initialization failed" → Check your private seed
- If payment dialog doesn't open → Check Pi SDK loading
- If authentication fails → Check validation key

## Credit Packages Available:
- 10 credits for π 1.0
- 25 credits for π 2.0 (Popular)
- 50 credits for π 3.5
- 100 credits for π 6.0