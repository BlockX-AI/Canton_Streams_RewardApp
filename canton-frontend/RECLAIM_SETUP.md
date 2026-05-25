# Reclaim Protocol Integration Setup Guide

## Overview

Your campaign now includes **Reclaim Protocol** integration for verifying GitHub ownership on Canton Network. This guide walks you through the complete setup process.

## What Has Been Implemented

### 1. **Reclaim SDK Integration**
- ✅ Added `@reclaimprotocol/js-sdk` to dependencies
- ✅ Added `qrcode` library for QR code generation (React 19 compatible)
- ✅ Created `useReclaimVerification` hook for proof generation
- ✅ Created `ReclaimVerification` component with QR code UI
- ✅ Created `useReclaimContract` hook for on-chain verification
- ✅ Updated campaign page to use real Reclaim verification

### 2. **Environment Variables Added**
```env
# Reclaim Protocol Configuration
NEXT_PUBLIC_RECLAIM_APP_ID=your_reclaim_app_id
NEXT_PUBLIC_RECLAIM_APP_SECRET=your_reclaim_app_secret
NEXT_PUBLIC_RECLAIM_GITHUB_PROVIDER_ID=your_github_provider_id
NEXT_PUBLIC_RECLAIM_CONTRACT=0x...
```

## Setup Instructions

### Step 1: Install Dependencies

```bash
npm install
```

This will install:
- `@reclaimprotocol/js-sdk` - Reclaim Protocol SDK
- `qrcode` - QR code generation library
- `@types/qrcode` - TypeScript types for qrcode

### Step 2: Get Reclaim Credentials

1. **Visit Reclaim Dev Portal:**
   - Go to https://dev.reclaimprotocol.org/
   - Sign up / Log in

2. **Create a New Application:**
   - Click "Create New App"
   - Name: "GrowStreams Campaign"
   - Description: "Web3 Contribution Challenge"
   - Save your `APP_ID` and `APP_SECRET`

3. **Configure GitHub Provider:**
   - Go to "Providers" section
   - Find or create "GitHub" provider
   - Copy the `PROVIDER_ID`
   - Configure the provider to verify GitHub username ownership

### Step 3: Deploy Reclaim Contract (Optional)

**Note:** For Canton Network, Reclaim verification can be done off-chain via the backend API. On-chain verification is optional.

If you want on-chain verification, you can deploy a Reclaim contract. Follow the official Reclaim SDK guide for your chosen blockchain.

For Canton DevNet, we recommend using off-chain verification via the FastAPI backend for simplicity.

### Step 4: Configure Environment

Update your `.env.local`:

```env
# Canton Network
CANTON_LEDGER_API_URL=http://localhost:7575

# Reclaim Protocol (off-chain verification)
NEXT_PUBLIC_RECLAIM_APP_ID=0x1234567890abcdef...
NEXT_PUBLIC_RECLAIM_APP_SECRET=your-secret-key-here
NEXT_PUBLIC_RECLAIM_GITHUB_PROVIDER_ID=github-provider-id

# Optional: On-chain contract (if deploying)
# NEXT_PUBLIC_RECLAIM_CONTRACT=0xYOUR_DEPLOYED_CONTRACT_ADDRESS
```

### Step 5: Update Contract ABIs

When your Reclaim contract is deployed, you'll receive metadata. Update the hooks:

#### `/hooks/useReclaimContract.ts`
```typescript
import reclaimMetadata from './reclaim-metadata.json';

const RECLAIM_ABI = reclaimMetadata; // Replace the empty {}
```

## How It Works

### User Flow:

1. **User enters GitHub username** → Stored in state
2. **ReclaimVerification component loads** → Generates QR code
3. **User scans QR with Reclaim Wallet app** → Proves GitHub ownership
4. **Proof received** → Stored in state
5. **Optional: Submit proof on-chain** → Via `useReclaimContract()`
6. **Continue to analysis** → With verified GitHub ID

### Technical Flow:

```typescript
// 1. Initialize proof request
const { initializeProofRequest } = useReclaimVerification();
await initializeProofRequest(githubUsername);

// 2. Generate QR code
// Displayed automatically by ReclaimVerification component

// 3. Receive proof
onVerified={(proof) => {
  // proof contains verified GitHub data
  setReclaimProof(proof);
}}

// 4. Optional: Verify on-chain
const { submitProofOnChain } = useReclaimContract();
await submitProofOnChain(transformedProof);
```

## Testing Locally

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Navigate to campaign:**
   http://localhost:3000/campaign

3. **Test flow:**
   - Connect Canton party ID
   - Enter GitHub username
   - See QR code generated
   - *Note: You'll need Reclaim Wallet app on mobile to complete verification*

## Reclaim Wallet App

Users need the Reclaim Wallet mobile app to scan QR codes:

- **Download:** https://reclaimprotocol.org/wallet
- Available for iOS and Android
- Used to generate zero-knowledge proofs of GitHub ownership

## Contract Functions

Your deployed Reclaim contract should support:

```rust
// Initialize contract
pub fn initiate(&mut self) -> Result<(), Error>

// Add epoch witnesses
pub fn add_epoch(&mut self, witnesses: Vec<Witness>, epoch: u32) -> Result<(), Error>

// Verify proof
pub fn verify_proof(&self, proof: Proof) -> Result<bool, Error>
```

## API Integration (Optional)

For server-side verification, create an API route:

```typescript
// app/api/verify-reclaim/route.ts
export async function POST(req: Request) {
  const { proof, githubUsername } = await req.json();
  
  // Verify proof structure
  // Check signatures
  // Validate GitHub username from proof
  // Store verification in database
  
  return Response.json({ verified: true });
}
```

## Troubleshooting

### QR Code Not Showing
- Check that `NEXT_PUBLIC_RECLAIM_APP_ID` is set
- Check browser console for errors
- Ensure `qrcode.react` is installed

### Proof Not Received
- Ensure Reclaim Wallet app is updated
- Check network connectivity
- Verify provider ID is correct

### Contract Errors
- Ensure contract is initialized (`initiate()`)
- Ensure epochs are added (`addEpoch()`)
- Check witness configuration

## Resources

- **Reclaim Docs:** https://docs.reclaimprotocol.org/
- **Reclaim SDK:** https://github.com/reclaimprotocol/js-sdk
- **Example App:** https://github.com/reclaimprotocol/example-app
- **Canton Network:** https://digitalasset.com/
- **Canton Docs:** https://docs.digitalasset.com/

## Security Notes

1. **Never expose APP_SECRET** client-side - only in API routes
2. **Verify proofs on-chain** for production use
3. **Rate limit** proof requests to prevent abuse
4. **Store verified proofs** in your database with timestamps

## Next Steps

1. ✅ Get Reclaim credentials from dev portal
2. ✅ Update environment variables
3. ✅ Test QR code generation
4. ✅ Download Reclaim Wallet app
5. ✅ Test complete verification flow
6. ✅ Integrate with GitHub analysis API
7. ✅ (Optional) Deploy on-chain verification contract

---

**You're all set!** The Reclaim integration is now live in your campaign. Users can verify GitHub ownership with zero-knowledge proofs. 🎉
