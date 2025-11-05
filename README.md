# Artha - Your Personal Finance & Business Mentor

Artha is a modern, AI-powered financial management and business development application designed specifically for early-stage entrepreneurs and MSMEs in India. It combines essential financial tracking tools with a suite of AI-driven features to provide financial clarity, generate business plans, and foster community connections.

![Artha Dashboard](https://storage.googleapis.com/studio-assets/readme-dashboard.png)

## Functionality Overview

Artha is designed to be a comprehensive co-pilot for entrepreneurs, from managing daily finances to planning long-term business strategy.

### 1. Core Financial Management

At its heart, Artha is a robust tool for tracking your financial health.

*   **Dashboard**: The central hub of your financial life. After logging in, you are greeted with a clear summary of your total income, total expenses, and savings rate. The dashboard also features an AI-generated "Fin Bite"—a personalized, actionable tip based on your recent financial activity.
*   **Transaction Management**: Manually add income and expense transactions with descriptions, dates, and amounts.
*   **AI-Powered Import**: Save time by using the AI import tool. Upload a financial document (like a PDF bank statement or a CSV file), and the app's AI will automatically parse the document, extract all transactions, and add them to your history.
*   **Budgeting**: Create monthly budgets for different spending categories (e.g., "Groceries," "Rent," "Marketing"). The app tracks your spending in real-time against these budgets and visualizes your progress, helping you stay on track.
*   **Goal Tracking**: Set and monitor financial goals. For individuals, this could be a "Savings Goal" like a down payment for a car. For MSMEs, this could be a "Development Goal" like funding a new marketing campaign. The dashboard tracks your available funds against the total target for all your goals.

### 2. AI-Powered Advisory & Brainstorming

Artha integrates AI to provide intelligent assistance beyond simple tracking.

*   **AI Financial Advisor**: A conversational chat interface where you can ask financial questions. The AI uses your recent transaction history as context to provide personalized, relevant advice. You can ask things like, "Where is most of my money going?" or "Suggest ways to reduce my monthly expenses."
*   **Business Idea Brainstorming**: This section is an idea generation powerhouse.
    *   **Curated Ideas**: Explore a library of pre-vetted startup ideas organized by category (e.g., AgriTech, Eco-Friendly).
    *   **AI Analysis**: Select a curated idea or enter your own custom business concept. The AI will generate a detailed, structured analysis covering:
        *   Investment Strategy
        *   Target Audience & Marketing
        *   Return on Investment (ROI) Projections
        *   Future-Proofing & Scalability
        *   Relevant Indian Government Schemes
        *   Key Legal & Regulatory Requirements
    *   **Save & Manage Ideas**: Any idea you analyze is automatically saved to your "My Ideas" section for future reference.

### 3. Automated Detailed Project Report (DPR) Generation

This is one of the app's most powerful features, turning your business idea into a bank-ready document.

*   **Tailored for Purpose**: Choose to generate a DPR optimized for bank loan applications, government schemes, or legal documentation. The AI adapts the structure and tone accordingly.
*   **Section-by-Section Generation**: The AI intelligently builds a complete, multi-section Detailed Project Report, generating content for everything from the executive summary and market analysis to financial projections and a SWOT analysis.
*   **Interactive Editing & Refinement**: Manually edit any section of the generated report with a rich text editor or use the AI Toolkit to refine specific sections with custom prompts, ensuring the final document perfectly matches your vision. The final DPR is a structured document ready for review by banks and investors.

### 4. Launchpad & Growth Hub

This section provides resources and community connections to help you launch and grow your business.

*   **MSME Marketplace**: A community hub where MSMEs can list their services. Other users can search this marketplace to find and connect with local businesses for services like digital marketing, accounting, etc. MSME users can publish their own profiles to be discovered.
*   **Resource Center**: An explorable list of key Indian government schemes, information on major startup ecosystems in India, and a step-by-step guide to the entrepreneurial journey.

### 5. Profile & Authentication

*   **Secure Authentication**: User accounts are securely managed through Firebase Authentication, supporting email/password signup.
*   **User Profiles**: Users can manage their profile information. Users who sign up as an MSME can add their business details (name, service, location, contact) which will be listed in the MSME Marketplace.

## 🚀 Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (with App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI**: [React](https://react.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Component Library**: [ShadCN/UI](httpss://ui.shadcn.com/)
- **Database & Auth**: [Firebase](https://firebase.google.com/) (Cloud Firestore, Firebase Authentication)
- **Generative AI**: [Google AI (Gemini)](https://ai.google/)
- **Icons**: [Lucide React](https://lucide.dev/guide/packages/lucide-react)

## 🛠️ Getting Started & Pushing to Your Own Repository

To get this project's code into your own GitHub repository, follow these steps in your local terminal.

### 1. Link to Your New Repository
From your project's directory in your terminal, update the remote `origin` to point to your new repository.

```bash
git remote set-url origin https://github.com/nikhil49023/Financifyv3.git
```

### 2. Push the Code
Finally, push all the code to your new repository. The `-u` flag sets the new remote as the default for future pushes.

```bash
git push -u origin main
```

Now, your new GitHub repository at `https://github.com/nikhil49023/Financifyv3.git` will contain all the code for the Artha app.