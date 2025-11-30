
'use client';

import { useAuth } from '@/context/auth-provider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const dprWizardHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wealthin DPR Wizard - MSME Loan Ready</title>
    <style>
        :root {
            --color-white: rgba(255, 255, 255, 1);
            --color-wealthin-50: rgba(245, 250, 252, 1);
            --color-wealthin-100: rgba(228, 240, 247, 1);
            --color-wealthin-600: rgba(34, 128, 179, 1);
            --color-wealthin-700: rgba(20, 100, 150, 1);
            --color-wealthin-900: rgba(12, 45, 75, 1);
            --color-gray-200: rgba(245, 245, 245, 1);
            --color-gray-300: rgba(167, 169, 169, 1);
            --color-success-500: rgba(34, 197, 94, 1);
            --color-warning-500: rgba(245, 158, 11, 1);
            --color-error-500: rgba(239, 68, 68, 1);
            
            --font-family-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            --font-size-base: 14px;
            --font-size-lg: 16px;
            --font-size-xl: 18px;
            --font-size-2xl: 20px;
            --font-size-3xl: 24px;
            --font-weight-medium: 500;
            --font-weight-semibold: 600;
            --space-4: 4px;
            --space-8: 8px;
            --space-12: 12px;
            --space-16: 16px;
            --space-20: 20px;
            --space-24: 24px;
            --space-32: 32px;
            --radius-base: 8px;
            --radius-lg: 12px;
            --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.04);
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.04);
        }

        * {
            box-sizing: border-box;
        }

        html, body {
            margin: 0;
            padding: 0;
            font-family: var(--font-family-base);
            background: var(--color-wealthin-50);
            color: var(--color-wealthin-900);
            line-height: 1.5;
        }

        body {
            padding: var(--space-16);
        }

        .container {
            max-width: 1000px;
            margin: 0 auto;
            background: var(--color-white);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-md);
            overflow: hidden;
        }

        .header {
            background: linear-gradient(135deg, var(--color-wealthin-600), var(--color-wealthin-700));
            color: var(--color-white);
            padding: var(--space-32);
            text-align: center;
        }

        .header h1 {
            margin: 0 0 var(--space-8) 0;
            font-size: var(--font-size-3xl);
            font-weight: var(--font-weight-semibold);
        }

        .header p {
            margin: 0;
            font-size: var(--font-size-lg);
            opacity: 0.9;
        }

        .nav-tabs {
            display: flex;
            flex-wrap: wrap;
            border-bottom: 2px solid var(--color-gray-200);
            background: var(--color-gray-200);
            gap: 0;
        }

        .nav-tabs button {
            flex: 1;
            padding: var(--space-16);
            background: transparent;
            border: none;
            cursor: pointer;
            font-size: var(--font-size-base);
            font-weight: var(--font-weight-medium);
            color: var(--color-wealthin-900);
            text-align: center;
            transition: all 0.3s ease;
            border-bottom: 3px solid transparent;
            margin-bottom: -2px;
        }

        .nav-tabs button:hover {
            background: var(--color-white);
        }

        .nav-tabs button.active {
            color: var(--color-wealthin-600);
            background: var(--color-white);
            border-bottom-color: var(--color-wealthin-600);
        }

        .tab-content {
            display: none;
            padding: var(--space-32);
            animation: fadeIn 0.3s ease;
        }

        .tab-content.active {
            display: block;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        h2 {
            margin: 0 0 var(--space-20) 0;
            font-size: var(--font-size-2xl);
            font-weight: var(--font-weight-semibold);
            color: var(--color-wealthin-700);
            border-bottom: 2px solid var(--color-gray-200);
            padding-bottom: var(--space-12);
        }

        h3 {
            margin: var(--space-20) 0 var(--space-12) 0;
            font-size: var(--font-size-xl);
            font-weight: var(--font-weight-semibold);
            color: var(--color-wealthin-900);
        }

        .form-group {
            margin-bottom: var(--space-20);
        }

        label {
            display: block;
            margin-bottom: var(--space-8);
            font-weight: var(--font-weight-medium);
            font-size: var(--font-size-base);
            color: var(--color-wealthin-900);
        }

        input[type="text"],
        input[type="number"],
        input[type="email"],
        input[type="date"],
        textarea,
        select {
            width: 100%;
            padding: var(--space-12);
            border: 1px solid var(--color-gray-300);
            border-radius: var(--radius-base);
            font-family: var(--font-family-base);
            font-size: var(--font-size-base);
            color: var(--color-wealthin-900);
            transition: border-color 0.3s ease;
        }

        input[type="text"]:focus,
        input[type="number"]:focus,
        input[type="email"]:focus,
        input[type="date"]:focus,
        textarea:focus,
        select:focus {
            outline: none;
            border-color: var(--color-wealthin-600);
            box-shadow: 0 0 0 3px rgba(34, 128, 179, 0.1);
        }

        textarea {
            resize: vertical;
            min-height: 100px;
        }

        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: var(--space-16);
        }

        .form-row.full {
            grid-template-columns: 1fr;
        }

        .btn {
            padding: var(--space-12) var(--space-20);
            border: none;
            border-radius: var(--radius-base);
            font-size: var(--font-size-base);
            font-weight: var(--font-weight-medium);
            cursor: pointer;
            transition: all 0.3s ease;
            display: inline-flex;
            align-items: center;
            gap: var(--space-8);
        }

        .btn-primary {
            background: var(--color-wealthin-600);
            color: var(--color-white);
        }

        .btn-primary:hover {
            background: var(--color-wealthin-700);
        }

        .btn-secondary {
            background: var(--color-gray-200);
            color: var(--color-wealthin-900);
        }

        .btn-secondary:hover {
            background: var(--color-gray-300);
        }

        .btn-success {
            background: var(--color-success-500);
            color: var(--color-white);
        }

        .info-box {
            background: rgba(34, 128, 179, 0.08);
            border-left: 4px solid var(--color-wealthin-600);
            padding: var(--space-16);
            margin-bottom: var(--space-16);
            border-radius: var(--radius-base);
        }

        .warning-box {
            background: rgba(245, 158, 11, 0.08);
            border-left: 4px solid var(--color-warning-500);
            padding: var(--space-16);
            margin-bottom: var(--space-16);
            border-radius: var(--radius-base);
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin: var(--space-16) 0;
        }

        th, td {
            padding: var(--space-12);
            text-align: left;
            border-bottom: 1px solid var(--color-gray-200);
        }

        th {
            background: var(--color-wealthin-50);
            font-weight: var(--font-weight-semibold);
            color: var(--color-wealthin-900);
        }

        tr:hover {
            background: var(--color-wealthin-50);
        }

        .ratio-display {
            background: var(--color-wealthin-50);
            padding: var(--space-16);
            border-radius: var(--radius-base);
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: var(--space-16);
            margin: var(--space-16) 0;
        }

        .ratio-item {
            text-align: center;
        }

        .ratio-value {
            font-size: var(--font-size-2xl);
            font-weight: var(--font-weight-semibold);
            color: var(--color-wealthin-700);
            margin: var(--space-8) 0;
        }

        .ratio-label {
            font-size: var(--font-size-base);
            color: var(--color-wealthin-900);
        }

        .ratio-status {
            font-size: var(--font-size-base);
            padding: var(--space-4) var(--space-8);
            border-radius: var(--radius-base);
            margin-top: var(--space-8);
            font-weight: var(--font-weight-medium);
        }

        .status-pass {
            background: rgba(34, 197, 94, 0.2);
            color: var(--color-success-500);
        }

        .status-fail {
            background: rgba(239, 68, 68, 0.2);
            color: var(--color-error-500);
        }

        .checklist {
            list-style: none;
            padding: 0;
        }

        .checklist li {
            padding: var(--space-12);
            margin-bottom: var(--space-8);
            background: var(--color-wealthin-50);
            border-radius: var(--radius-base);
            display: flex;
            align-items: center;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .checklist li:hover {
            background: var(--color-wealthin-100);
        }

        .checklist li.checked {
            background: rgba(34, 128, 179, 0.1);
        }

        .checklist input[type="checkbox"] {
            margin-right: var(--space-12);
            cursor: pointer;
            width: 18px;
            height: 18px;
        }

        .summary-card {
            background: var(--color-wealthin-50);
            padding: var(--space-16);
            border-radius: var(--radius-base);
            border-left: 4px solid var(--color-wealthin-600);
            margin-bottom: var(--space-16);
        }

        .summary-card strong {
            color: var(--color-wealthin-700);
        }

        .footer {
            background: var(--color-wealthin-50);
            padding: var(--space-20);
            text-align: center;
            font-size: var(--font-size-base);
            color: var(--color-wealthin-900);
            border-top: 1px solid var(--color-wealthin-100);
        }

        @media (max-width: 768px) {
            body { padding: var(--space-8); }
            .form-row {
                grid-template-columns: 1fr;
            }

            .nav-tabs {
                gap: 0;
            }

            .nav-tabs button {
                flex: 1;
                font-size: 12px;
                padding: var(--space-12);
            }

            .ratio-display {
                grid-template-columns: 1fr;
            }

            .tab-content {
                padding: var(--space-16);
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-content">
                <h1>DPR Wizard</h1>
                <p>Build your bank-ready project report step by step</p>
            </div>
        </div>

        <div class="nav-tabs">
            <button class="nav-btn active" data-tab="overview">Overview</button>
            <button class="nav-btn" data-tab="project">Project Details</button>
            <button class="nav-btn" data-tab="financials">Financials</button>
            <button class="nav-btn" data-tab="viability">Viability</button>
            <button class="nav-btn" data-tab="risk">Risk Analysis</button>
            <button class="nav-btn" data-tab="checklist">Checklist</button>
            <button class="nav-btn" data-tab="summary">Summary</button>
        </div>

        <!-- Overview Tab -->
        <div id="overview" class="tab-content active">
            <h2>DPR Overview</h2>
            
            <div class="info-box">
                <strong>📋 What is a Bank-Ready DPR?</strong><br>
                A Detailed Project Report (DPR) is a comprehensive document that demonstrates the financial viability and feasibility of your MSME project to banks for loan approval.
            </div>

            <h3>Key Components</h3>
            <table>
                <thead>
                    <tr>
                        <th>Section</th>
                        <th>Purpose</th>
                        <th>Bank Focus</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Project Description</strong></td>
                        <td>Explain what, where, and why</td>
                        <td>Market viability</td>
                    </tr>
                    <tr>
                        <td><strong>Financial Projections</strong></td>
                        <td>5-year P&L, Balance Sheet, Cash Flow</td>
                        <td>Profitability</td>
                    </tr>
                    <tr>
                        <td><strong>Viability Ratios</strong></td>
                        <td>DSCR, Current Ratio, Debt-Equity</td>
                        <td>Repayment capacity</td>
                    </tr>
                    <tr>
                        <td><strong>Risk Analysis</strong></td>
                        <td>Identify and mitigate risks</td>
                        <td>Project safety</td>
                    </tr>
                </tbody>
            </table>

            <h3>Bank Approval Criteria (4Cs)</h3>
            <div class="summary-card">
                <strong>✓ Character:</strong> Your track record and business reputation<br>
                <strong>✓ Capacity:</strong> Experience and expertise to run the business<br>
                <strong>✓ Capital:</strong> Your own contribution (typically 20-25%)<br>
                <strong>✓ Collateral:</strong> Security offered against the loan
            </div>
        </div>

        <!-- Project Details Tab -->
        <div id="project" class="tab-content">
            <h2>Project Information</h2>

            <h3>Promoter Details</h3>
            <div class="form-row">
                <div class="form-group">
                    <label>Promoter Name</label>
                    <input type="text" id="promoterName" placeholder="Full name">
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="promoterEmail" placeholder="email@example.com">
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Mobile Number</label>
                    <input type="text" id="promoterMobile" placeholder="10-digit mobile">
                </div>
                <div class="form-group">
                    <label>Years of Experience in Business</label>
                    <input type="number" id="experience" placeholder="0-50" min="0" max="50">
                </div>
            </div>

            <h3>Business Details</h3>
            <div class="form-row full">
                <div class="form-group">
                    <label>Business Name</label>
                    <input type="text" id="businessName" placeholder="MSME name">
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Nature of Business</label>
                    <select id="businessType">
                        <option value="">Select type</option>
                        <option value="manufacturing">Manufacturing</option>
                        <option value="service">Service</option>
                        <option value="trading">Trading</option>
                        <option value="agriculture">Agriculture</option>
                        <option value="food">Food Processing</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>MSME Category</label>
                    <select id="msmeCategory">
                        <option value="">Select category</option>
                        <option value="micro">Micro (< ₹25 lakh)</option>
                        <option value="small">Small (₹25 lakh - ₹5 crore)</option>
                        <option value="medium">Medium (₹5 crore - ₹25 crore)</option>
                    </select>
                </div>
            </div>

            <div class="form-row full">
                <div class="form-group">
                    <label>Project Location (Address)</label>
                    <textarea id="location" placeholder="Full address including district, state"></textarea>
                </div>
            </div>

            <div class="form-row full">
                <div class="form-group">
                    <label>Project Description</label>
                    <textarea id="projectDesc" placeholder="Describe your project, products/services, market opportunity..."></textarea>
                </div>
            </div>

            <h3>Project Cost Summary</h3>
            <div class="form-row">
                <div class="form-group">
                    <label>Total Project Cost (₹ Lakh)</label>
                    <input type="number" id="totalCost" placeholder="0.00" step="0.01" min="0">
                </div>
                <div class="form-group">
                    <label>Fixed Assets Cost (₹ Lakh)</label>
                    <input type="number" id="fixedAssets" placeholder="0.00" step="0.01" min="0">
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Working Capital Required (₹ Lakh)</label>
                    <input type="number" id="workingCap" placeholder="0.00" step="0.01" min="0">
                </div>
                <div class="form-group">
                    <label>Pre-operative Expenses (₹ Lakh)</label>
                    <input type="number" id="preOpEx" placeholder="0.00" step="0.01" min="0">
                </div>
            </div>
        </div>

        <!-- Financials Tab -->
        <div id="financials" class="tab-content">
            <h2>Financial Projections</h2>

            <div class="warning-box">
                <strong>⚠️ Important:</strong> Provide conservative, realistic projections. Banks prefer underestimated revenue over inflated figures.
            </div>

            <h3>Key Assumptions (Year 1)</h3>
            <div class="form-row">
                <div class="form-group">
                    <label>Annual Sales Revenue (₹ Lakh)</label>
                    <input type="number" id="salesRev" placeholder="0.00" step="0.01" min="0" onchange="updateProjections()">
                </div>
                <div class="form-group">
                    <label>Cost of Goods Sold (% of Sales)</label>
                    <input type="number" id="cogsPct" placeholder="60" step="0.1" min="0" max="100" value="60" onchange="updateProjections()">
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Operating Expenses (% of Sales)</label>
                    <input type="number" id="opexPct" placeholder="15" step="0.1" min="0" max="100" value="15" onchange="updateProjections()">
                </div>
                <div class="form-group">
                    <label>Income Tax Rate (%)</label>
                    <input type="number" id="taxRate" placeholder="25" step="0.1" min="0" max="100" value="25" onchange="updateProjections()">
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Capacity Utilization (Year 1 - %)</label>
                    <input type="number" id="capUtil" placeholder="60" step="1" min="0" max="100" value="60" onchange="updateProjections()">
                </div>
                <div class="form-group">
                    <label>Annual Growth Rate (%)</label>
                    <input type="number" id="growthRate" placeholder="15" step="0.1" min="0" max="100" value="15" onchange="updateProjections()">
                </div>
            </div>

            <h3>Loan Details</h3>
            <div class="form-row">
                <div class="form-group">
                    <label>Loan Amount Required (₹ Lakh)</label>
                    <input type="number" id="loanAmount" placeholder="0.00" step="0.01" min="0" onchange="updateProjections()">
                </div>
                <div class="form-group">
                    <label>Interest Rate (% p.a.)</label>
                    <input type="number" id="interestRate" placeholder="10" step="0.1" min="0" max="20" value="10" onchange="updateProjections()">
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Loan Tenure (Years)</label>
                    <input type="number" id="loanTenure" placeholder="5" step="1" min="1" max="10" value="5" onchange="updateProjections()">
                </div>
                <div class="form-group">
                    <label>Moratorium Period (Months)</label>
                    <input type="number" id="moratorium" placeholder="6" step="1" min="0" max="24" value="6" onchange="updateProjections()">
                </div>
            </div>

            <div style="text-align: right; margin-top: var(--space-20);">
                <button class="btn btn-primary" onclick="calculateFinancials()">📊 Calculate Projections</button>
            </div>

            <div id="financialResults" style="margin-top: var(--space-20);"></div>
        </div>

        <!-- Viability Tab -->
        <div id="viability" class="tab-content">
            <h2>Financial Viability Analysis</h2>

            <div class="info-box">
                <strong>🎯 Critical Metrics:</strong> Banks focus on these ratios to assess your project's ability to repay the loan.
            </div>

            <h3>Required Financial Ratios</h3>

            <div class="summary-card">
                <strong>1. Debt Service Coverage Ratio (DSCR)</strong><br>
                Formula: Net Operating Income ÷ Total Debt Obligations<br>
                <strong style="color: var(--color-wealthin-700);">Bank Requirement: Minimum 1.3 - 1.5</strong><br>
                DSCR measures your ability to repay loans from operating income. Below 1.0 means you cannot repay from cash flow.
            </div>

            <div class="summary-card">
                <strong>2. Current Ratio</strong><br>
                Formula: Current Assets ÷ Current Liabilities<br>
                <strong style="color: var(--color-wealthin-700);">Bank Requirement: Minimum 1.2</strong><br>
                Shows your ability to pay short-term obligations.
            </div>

            <div class="summary-card">
                <strong>3. Debt-Equity Ratio</strong><br>
                Formula: Total Debt ÷ Total Equity<br>
                <strong style="color: var(--color-wealthin-700);">Bank Requirement: Maximum 3:1 (SSI), 2:1 (larger)</strong><br>
                Shows the proportion of debt and equity used to finance assets.
            </div>

            <h3>Calculate Your Ratios</h3>
            <div class="form-row">
                <div class="form-group">
                    <label>Net Operating Income (₹ Lakh)</label>
                    <input type="number" id="noi" placeholder="0.00" step="0.01" min="0">
                </div>
                <div class="form-group">
                    <label>Annual Debt Obligation (₹ Lakh)</label>
                    <input type="number" id="annualDebt" placeholder="0.00" step="0.01" min="0">
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Current Assets (₹ Lakh)</label>
                    <input type="number" id="currentAssets" placeholder="0.00" step="0.01" min="0">
                </div>
                <div class="form-group">
                    <label>Current Liabilities (₹ Lakh)</label>
                    <input type="number" id="currentLiab" placeholder="0.00" step="0.01" min="0">
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Total Debt (₹ Lakh)</label>
                    <input type="number" id="totalDebt" placeholder="0.00" step="0.01" min="0">
                </div>
                <div class="form-group">
                    <label>Total Equity (₹ Lakh)</label>
                    <input type="number" id="totalEquity" placeholder="0.00" step="0.01" min="0">
                </div>
            </div>

            <div style="text-align: right; margin-top: var(--space-20);">
                <button class="btn btn-primary" onclick="calculateRatios()">📈 Calculate Ratios</button>
            </div>

            <div id="ratioResults" style="margin-top: var(--space-20);"></div>
        </div>

        <!-- Risk Analysis Tab -->
        <div id="risk" class="tab-content">
            <h2>Risk Analysis & Mitigation</h2>

            <div class="info-box">
                <strong>⚠️ Risk Assessment:</strong> Banks expect you to identify potential risks and provide mitigation strategies.
            </div>

            <h3>Identify Key Risks</h3>
            <table>
                <thead>
                    <tr>
                        <th>Risk Category</th>
                        <th>Potential Risk</th>
                        <th>Impact</th>
                        <th>Mitigation Strategy</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Market Risk</strong></td>
                        <td>Demand fluctuation</td>
                        <td>Revenue drop</td>
                        <td>Diversify customer base</td>
                    </tr>
                    <tr>
                        <td><strong>Operational Risk</strong></td>
                        <td>Supply disruption</td>
                        <td>Production delay</td>
                        <td>Multiple suppliers</td>
                    </tr>
                    <tr>
                        <td><strong>Financial Risk</strong></td>
                        <td>Cost inflation</td>
                        <td>Margin squeeze</td>
                        <td>Long-term contracts</td>
                    </tr>
                    <tr>
                        <td><strong>Regulatory Risk</strong></td>
                        <td>Policy changes</td>
                        <td>Compliance cost</td>
                        <td>Monitor regulations</td>
                    </tr>
                </tbody>
            </table>

            <h3>Sensitivity Analysis</h3>
            <div class="form-row full">
                <div class="form-group">
                    <label>Base Case DSCR</label>
                    <input type="number" id="baseDSCR" placeholder="1.5" step="0.01" min="0.5" value="1.5" onchange="calculateSensitivity()">
                </div>
            </div>

            <div style="text-align: right; margin-top: var(--space-20);">
                <button class="btn btn-primary" onclick="calculateSensitivity()">🔍 Sensitivity Analysis</button>
            </div>

            <div id="sensitivityResults" style="margin-top: var(--space-20);"></div>

            <h3>Risk Mitigation Plan</h3>
            <div class="form-row full">
                <div class="form-group">
                    <label>Describe your risk mitigation strategies</label>
                    <textarea id="riskMitigation" placeholder="Explain how you will handle market risks, supply chain issues, cost inflation, etc."></textarea>
                </div>
            </div>
        </div>

        <!-- Checklist Tab -->
        <div id="checklist" class="tab-content">
            <h2>DPR Documentation Checklist</h2>

            <div class="warning-box">
                <strong>✓ Complete Checklist:</strong> Banks require these documents for DPR approval.
            </div>

            <h3>Personal & Corporate Documents</h3>
            <ul class="checklist">
                <li><input type="checkbox"> Promoter ID (Aadhar/PAN/Passport)</li>
                <li><input type="checkbox"> Last 3 Years Income Tax Returns (ITR)</li>
                <li><input type="checkbox"> Business Registration/GST Certificate</li>
                <li><input type="checkbox"> Partnership Deed or MOA (if applicable)</li>
                <li><input type="checkbox"> Address Proof</li>
            </ul>

            <h3>Financial Documents</h3>
            <ul class="checklist">
                <li><input type="checkbox"> Audited Balance Sheet & P&L (2-3 years)</li>
                <li><input type="checkbox"> Bank Statements (Last 12 months)</li>
                <li><input type="checkbox"> CMA Data (if turnover > ₹1 crore)</li>
                <li><input type="checkbox"> Detailed Cost Estimates with quotations</li>
                <li><input type="checkbox"> Financial Projections (5 years)</li>
                <li><input type="checkbox"> Source of Margin Funds proof</li>
            </ul>

            <h3>Technical & Legal Documents</h3>
            <ul class="checklist">
                <li><input type="checkbox"> Land/Property Documents (Ownership/Lease)</li>
                <li><input type="checkbox"> Site Plan & Layout Drawings</li>
                <li><input type="checkbox"> Machinery Quotations (on supplier letterhead)</li>
                <li><input type="checkbox"> Pollution Control Clearance</li>
                <li><input type="checkbox"> Environmental Compliance Certificate</li>
                <li><input type="checkbox"> Building Approval Drawings</li>
                <li><input type="checkbox"> Fire Safety Certificate (if applicable)</li>
            </ul>

            <h3>Market & Viability Documents</h3>
            <ul class="checklist">
                <li><input type="checkbox"> Market Research Report</li>
                <li><input type="checkbox"> Competitor Analysis</li>
                <li><input type="checkbox"> Product/Service Specifications</li>
                <li><input type="checkbox"> Customer Letters of Intent (if available)</li>
                <li><input type="checkbox"> Industry Growth Data</li>
            </ul>

            <h3>Other Documents</h3>
            <ul class="checklist">
                <li><input type="checkbox"> Photographs (Site with date stamp & geo-tag)</li>
                <li><input type="checkbox"> Insurance Policy Details</li>
                <li><input type="checkbox"> Experience Certificate (of key team members)</li>
                <li><input type="checkbox"> Any Other Relevant Documents</li>
            </ul>

            <div style="margin-top: var(--space-20); text-align: right;">
                <button class="btn btn-secondary" onclick="printChecklist()">🖨️ Print Checklist</button>
            </div>
        </div>

        <!-- Summary Tab -->
        <div id="summary" class="tab-content">
            <h2>DPR Summary Report</h2>

            <div id="summaryReport" style="line-height: 1.8;">
                <div class="info-box">
                    <strong>📄 Generate Summary:</strong> Review all sections and generate your DPR summary report.
                </div>
            </div>

            <div style="margin-top: var(--space-20); text-align: right; gap: var(--space-12); display: flex; justify-content: flex-end;">
                <button class="btn btn-secondary" onclick="generateSummary()">📋 Generate Summary</button>
                <button class="btn btn-success" onclick="exportDPR()">💾 Export DPR (PDF)</button>
            </div>

            <h3>Key Takeaways for Bank Approval</h3>
            <div class="summary-card">
                <strong>1. Conservative Projections:</strong> Banks prefer realistic over optimistic figures.<br>
                <strong>2. Strong DSCR:</strong> Aim for 1.5+ to demonstrate strong repayment capacity.<br>
                <strong>3. Risk Awareness:</strong> Show you've identified risks and have mitigation plans.<br>
                <strong>4. Complete Documentation:</strong> Missing documents delay approval.<br>
                <strong>5. Professional Presentation:</strong> Clear, organized DPR creates better impression.
            </div>

            <div class="summary-card" style="margin-top: var(--space-16);">
                <strong>💡 Pro Tips:</strong><br>
                • Ensure margin money (20-25%) is proven and available<br>
                • Provide independent market research data<br>
                • Get machinery quotations on official supplier letterhead<br>
                • Include 3 years of audited financials (if existing business)<br>
                • Present clear, organized sections with proper numbering<br>
                • Get professional help if dealing with > ₹50 lakh project cost
            </div>
        </div>

        <div class="footer">
            <p>💼 Bank-Ready DPR Generator for MSME | RBI Compliant Format | For informational purposes</p>
        </div>
    </div>

    <script>
        // Tab Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const tabName = this.getAttribute('data-tab');
                showTab(tabName);
            });
        });

        function showTab(tabName) {
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            document.getElementById(tabName).classList.add('active');
            event.currentTarget.classList.add('active');
        }

        // Financial Calculations
        function calculateFinancials() {
            const salesRev = parseFloat(document.getElementById('salesRev').value) || 0;
            const cogsPct = parseFloat(document.getElementById('cogsPct').value) / 100;
            const opexPct = parseFloat(document.getElementById('opexPct').value) / 100;
            const taxRate = parseFloat(document.getElementById('taxRate').value) / 100;
            const loanAmount = parseFloat(document.getElementById('loanAmount').value) || 0;
            const interestRate = parseFloat(document.getElementById('interestRate').value) / 100;
            const loanTenure = parseFloat(document.getElementById('loanTenure').value) || 5;

            const cogs = salesRev * cogsPct;
            const grossProfit = salesRev - cogs;
            const opex = salesRev * opexPct;
            const ebitda = grossProfit - opex;
            const annualInterest = loanAmount * interestRate;
            const ebit = ebitda - (loanAmount / loanTenure);
            const taxableIncome = Math.max(0, ebit - annualInterest);
            const tax = taxableIncome * taxRate;
            const netProfit = taxableIncome - tax;

            let html = '<h3>Year 1 Financial Projections</h3>';
            html += '<table>';
            html += '<tr><td><strong>Sales Revenue</strong></td><td>₹' + salesRev.toFixed(2) + ' L</td></tr>';
            html += '<tr><td>COGS (' + (cogsPct*100).toFixed(1) + '%)</td><td>₹' + cogs.toFixed(2) + ' L</td></tr>';
            html += '<tr><td><strong>Gross Profit</strong></td><td>₹' + grossProfit.toFixed(2) + ' L</td></tr>';
            html += '<tr><td>Operating Expenses (' + (opexPct*100).toFixed(1) + '%)</td><td>₹' + opex.toFixed(2) + ' L</td></tr>';
            html += '<tr><td><strong>EBITDA</strong></td><td>₹' + ebitda.toFixed(2) + ' L</td></tr>';
            html += '<tr><td>Depreciation & Amortization</td><td>₹' + (loanAmount / loanTenure).toFixed(2) + ' L</td></tr>';
            html += '<tr><td><strong>EBIT</strong></td><td>₹' + ebit.toFixed(2) + ' L</td></tr>';
            html += '<tr><td>Interest on Loan</td><td>₹' + annualInterest.toFixed(2) + ' L</td></tr>';
            html += '<tr><td>Taxable Income</td><td>₹' + taxableIncome.toFixed(2) + ' L</td></tr>';
            html += '<tr><td>Income Tax (' + (taxRate*100).toFixed(1) + '%)</td><td>₹' + tax.toFixed(2) + ' L</td></tr>';
            html += '<tr style="background: var(--color-wealthin-50);"><td><strong>Net Profit</strong></td><td><strong>₹' + netProfit.toFixed(2) + ' L</strong></td></tr>';
            html += '</table>';

            document.getElementById('financialResults').innerHTML = html;
            
            document.getElementById('noi').value = ebitda.toFixed(2);
        }

        function updateProjections() {
            // Placeholder for future logic
        }

        function calculateRatios() {
            const noi = parseFloat(document.getElementById('noi').value) || 0;
            const annualDebt = parseFloat(document.getElementById('annualDebt').value) || 0.1;
            const currentAssets = parseFloat(document.getElementById('currentAssets').value) || 0.1;
            const currentLiab = parseFloat(document.getElementById('currentLiab').value) || 0.1;
            const totalDebt = parseFloat(document.getElementById('totalDebt').value) || 0.1;
            const totalEquity = parseFloat(document.getElementById('totalEquity').value) || 0.1;

            const dscr = noi / annualDebt;
            const currentRatio = currentAssets / currentLiab;
            const debtEquity = totalDebt / totalEquity;

            let html = '<h3>Financial Ratios Analysis</h3>';
            html += '<div class="ratio-display">';

            const dscrStatus = dscr >= 1.3 ? 'Pass' : 'Fail';
            html += '<div class="ratio-item"><div class="ratio-label">Debt Service Coverage Ratio</div><div class="ratio-value">' + dscr.toFixed(2) + '</div><div class="ratio-label">Bank Requirement: ≥ 1.3</div><div class="ratio-status ' + (dscrStatus === 'Pass' ? 'status-pass' : 'status-fail') + '">' + dscrStatus + '</div></div>';

            const currStatus = currentRatio >= 1.2 ? 'Pass' : 'Fail';
            html += '<div class="ratio-item"><div class="ratio-label">Current Ratio</div><div class="ratio-value">' + currentRatio.toFixed(2) + '</div><div class="ratio-label">Bank Requirement: ≥ 1.2</div><div class="ratio-status ' + (currStatus === 'Pass' ? 'status-pass' : 'status-fail') + '">' + currStatus + '</div></div>';

            const deStatus = debtEquity <= 3 ? 'Pass' : 'Fail';
            html += '<div class="ratio-item"><div class="ratio-label">Debt-Equity Ratio</div><div class="ratio-value">' + debtEquity.toFixed(2) + ':1</div><div class="ratio-label">Bank Requirement: ≤ 3:1</div><div class="ratio-status ' + (deStatus === 'Pass' ? 'status-pass' : 'status-fail') + '">' + deStatus + '</div></div>';
            html += '</div>';

            document.getElementById('ratioResults').innerHTML = html;
        }

        function calculateSensitivity() {
            const baseDSCR = parseFloat(document.getElementById('baseDSCR').value) || 1.5;
            let html = '<h3>Sensitivity Analysis Results</h3><p><strong>Base Case DSCR: ' + baseDSCR.toFixed(2) + '</strong></p><table><thead><tr><th>Scenario</th><th>Revenue Impact</th><th>Projected DSCR</th><th>Status</th></tr></thead><tbody>';
            const scenarios = [{ label: 'Pessimistic', change: -20 }, { label: 'Conservative', change: -10 }, { label: 'Base Case', change: 0 }, { label: 'Optimistic', change: 10 }, { label: 'Best Case', change: 20 }];
            scenarios.forEach(scenario => {
                const dscr = baseDSCR * (1 + scenario.change / 100);
                const status = dscr >= 1.3 ? '✓ Pass' : '✗ Fail';
                const statusClass = dscr >= 1.3 ? 'status-pass' : 'status-fail';
                html += '<tr><td><strong>' + scenario.label + '</strong></td><td>' + scenario.change + '%</td><td><strong>' + dscr.toFixed(2) + '</strong></td><td><span class="ratio-status ' + statusClass + '">' + status + '</span></td></tr>';
            });
            html += '</tbody></table><div class="info-box" style="margin-top: var(--space-16);">💡 <strong>Interpretation:</strong> This shows how revenue changes affect your ability to repay. A DSCR below 1.3 in pessimistic scenarios suggests higher risk.</div>';
            document.getElementById('sensitivityResults').innerHTML = html;
        }

        document.querySelectorAll('.checklist input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', function() { this.parentElement.classList.toggle('checked'); });
        });

        function printChecklist() { window.print(); }

        function generateSummary() {
            const promoterName = document.getElementById('promoterName').value || 'Not provided';
            const businessName = document.getElementById('businessName').value || 'Not provided';
            const location = document.getElementById('location').value || 'Not provided';
            const totalCost = parseFloat(document.getElementById('totalCost').value) || 0;
            const loanAmount = parseFloat(document.getElementById('loanAmount').value) || 0;
            let html = '<h3>Executive Summary</h3><div class="summary-card">';
            html += '<strong>Promoter:</strong> ' + promoterName + '<br>';
            html += '<strong>Business:</strong> ' + businessName + '<br>';
            html += '<strong>Location:</strong> ' + location + '<br>';
            html += '<strong>Total Project Cost:</strong> ₹' + totalCost.toFixed(2) + ' Lakh<br>';
            html += '<strong>Loan Amount Requested:</strong> ₹' + loanAmount.toFixed(2) + ' Lakh<br>';
            html += '<strong>Promoter Contribution (Margin):</strong> ₹' + (totalCost - loanAmount).toFixed(2) + ' Lakh (' + ((totalCost - loanAmount) / totalCost * 100).toFixed(1) + '%)<br>';
            html += '</div><h3>Next Steps for Bank Submission</h3><ol><li>Compile all required documents from the Checklist tab</li><li>Prepare detailed financial statements with supporting calculations</li><li>Include market research and competitor analysis</li><li>Get machinery quotations on supplier letterheads</li><li>Organize DPR in proper chapter format</li><li>Submit to bank loan department with supporting documents</li><li>Follow up after submission</li></ol>';
            document.getElementById('summaryReport').innerHTML = html;
        }

        function exportDPR() { alert('PDF Export Feature:\\n\\nTo export as PDF, please:\\n1. Use browser Print (Ctrl+P or Cmd+P)\\n2. Select "Save as PDF"\\n3. Configure layout\\n4. Save the file'); }
    </script>
</body>
</html>
