# WealthIn Application: Estimated Monthly Cost at Scale

This document provides a high-level estimate of the monthly operational costs to run the WealthIn application for **10,000 active users**.

**Disclaimer**: This is an estimate based on a set of assumptions about user behavior. Actual costs may vary depending on real-world usage patterns, feature adoption, and pricing changes from service providers.

## Core Services & Cost Drivers

The primary cost drivers for this application are:
1.  **Firebase Services**: Hosting, Database (Firestore), Authentication, and Storage.
2.  **Sarvam AI API**: All generative AI features.

---

## Assumptions for 10,000 Monthly Active Users (MAU)

To create a tangible estimate, we'll assume the following about a "typical" active user per month:

- **Logins**: 15 times/month (every other day).
- **Transactions**:
    - Manually adds 20 transactions.
    - Uses AI import once to extract 50 transactions.
- **AI Feature Usage**:
    - Generates 1 Dashboard Summary per login.
    - Has 2 conversations with the AI Advisor.
    - Analyzes 2 new business ideas.
    - Generates 1 full Detailed Project Report (DPR).
    - Generates 1 Budget Report.
- **Data Storage**:
    - Each transaction document is ~1 KB.
    - Each user has ~10 other documents (profile, goals, etc.) averaging 2 KB.
    - Each user uploads 1 document for import (1 MB) and 5 invoices (200 KB each), totaling 2 MB.

---

## 1. Firebase Cost Estimation

Calculations are based on the Firebase "Blaze" (Pay-as-you-go) plan pricing.

### a. Firebase App Hosting (for Next.js)
- For 10,000 users, we'll need more than the free tier allows. Let's estimate 2 instances running to handle traffic.
- **Estimated Cost**: **~$50 - $120 / month**. This is highly variable and depends on CPU usage and data transfer. We'll take a conservative average.

### b. Firebase Authentication
- The first 50,000 Monthly Active Users (MAU) are free.
- **Estimated Cost**: **$0 / month**.

### c. Cloud Firestore (Database)
- **Data Storage**:
    - User Data: 10,000 users * (70 transactions * 1KB + 10 docs * 2KB) = ~0.9 GB
    - **Cost**: **~$0.16 / month** (well within the free tier).

- **Document Reads**:
    - `Dashboard`: 15 logins * 10k users * (1 profile read + 20 transaction reads) = 3.15M reads
    - `Transactions Page`: 2 views * 10k users * 70 reads = 1.4M reads
    - `AI Advisor`: 2 chats * 10k users * 20 reads = 400k reads
    - *Total Reads*: ~5 Million reads/month
    - **Cost**: (5M - 1.5M free) * $0.06/100k = **$2.10 / month**

- **Document Writes**:
    - `Signups`: 10,000 users * 1 write = 10k writes
    - `Manual Transactions`: 10k users * 20 writes = 200k writes
    - `AI Import`: 10k users * 50 writes = 500k writes
    - `Other` (Budgets, Goals, Saved Ideas): ~10k users * 5 writes = 50k writes
    - *Total Writes*: ~760,000 writes/month
    - **Cost**: (760k - 600k free) * $0.18/100k = **$0.29 / month**

- **Firestore Total**: **~$2.55 / month**

### d. Cloud Storage
- **Data Storage**: 10,000 users * 2 MB/user = 20 GB
    - **Cost**: (20 GB - 5 GB free) * $0.026/GB = **$0.39 / month**

- **Download Operations**: Assuming each file is accessed twice on average.
    - (10k docs + 50k invoices) * 2 = 120,000 downloads
    - **Cost**: (120k - 50k free) * $0.004/10k = **$0.03 / month**

- **Upload Operations**:
    - 10k doc imports + 50k invoice uploads = 60,000 uploads
    - **Cost**: (60k - 20k free) * $0.05/10k = **$0.20 / month**

- **Storage Total**: **~$0.62 / month**

### **Firebase Subtotal**: **~$50 - $125 / month**
*(Dominated by App Hosting costs)*

---

## 2. Sarvam AI API Cost Estimation

This is the most significant and variable cost. Pricing is based on tokens (input + output). We will assume an average rate for `sarvam-1` and `sarvam-m` models.
- **Assumption**: Let's estimate an average cost of **$0.001 per AI request** for simplicity, acknowledging that DPR generation will be much more expensive than simple summaries.

- **AI Calls per Month**:
    - `Dashboard Summary`: 15 calls * 10k users = 150,000
    - `AI Advisor`: 2 calls * 10k users = 20,000
    - `Transaction Import`: 1 call * 10k users = 10,000
    - `Idea Analysis`: 2 calls * 10k users = 20,000
    - `DPR Generation (2 stages)`: 2 calls * 10k users = 20,000
    - `Budget Report`: 1 call * 10k users = 10,000
    - **Total AI Calls**: **230,000 calls / month**

- **Estimated Cost**: 230,000 calls * $0.001/call = **$230 / month**

---

## Grand Total Estimated Monthly Cost

| Service             | Estimated Monthly Cost | Notes                                           |
| ------------------- | ---------------------- | ----------------------------------------------- |
| **Firebase Services** | **~$50 - $125**        | Primarily driven by App Hosting compute time.     |
| **Sarvam AI API**   | **~$230**              | Highly dependent on actual feature usage & complexity. |
| **Total**           | **~$280 - $355 / month** |                                                 |

This equates to a per-user cost of approximately **$0.03 per month**.

### Key Takeaways & Cost Optimization Strategies

1.  **AI Usage is the Main Cost**: The biggest expense by far is the AI API. To manage this, you could:
    - **Implement Caching**: Cache AI-generated responses (like idea analysis) to avoid re-generating the same content.
    - **Rate Limiting**: Limit how often a user can use expensive features like DPR generation (e.g., once per month). The current app already has a simple limit for idea analysis.
    - **Use Cheaper Models**: Use `sarvam-1` for all but the most complex reasoning tasks.

2.  **App Hosting is the Next Factor**: If user traffic is spiky, hosting costs can rise. Ensure the app is optimized for serverless environments and consider pre-rendering pages where possible.

3.  **Database Costs are Low**: Firestore costs are very low at this scale due to the small document sizes. This is a good sign for scalability.
