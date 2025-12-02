
'use client';

import { useAuth } from '@/context/auth-provider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';
import { generateDprSectionAction } from '@/app/actions';
import type { GenerateInvestmentIdeaAnalysisOutput } from '@/ai/schemas/investment-idea-analysis';

const dprWizardHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wealthin - DPR Generator Pro</title>
    <style>
        :root {
            --primary: #1a7f7e;
            --primary-dark: #0d5554;
            --primary-light: #2d9d9c;
            --accent: #ff6b35;
            --success: #06d6a0;
            --warning: #f0ad4e;
            --error: #e74c3c;
            --neutral-900: #1a1a1a;
            --neutral-700: #404040;
            --neutral-500: #808080;
            --neutral-300: #d4d4d8;
            --neutral-200: #e4e4e7;
            --neutral-100: #f4f4f5;
            --neutral-50: #fafafa;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        html, body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            min-height: 100vh;
            color: var(--neutral-900);
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 24px;
        }

        /* ===== HEADER ===== */
        .header {
            background: white;
            padding: 20px 24px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            margin-bottom: 32px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .header-title {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .header-title h1 {
            font-size: 24px;
            font-weight: 700;
            color: var(--primary);
        }

        .header-badge {
            background: var(--success);
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }

        .header-progress {
            display: flex;
            align-items: center;
            gap: 16px;
            color: var(--neutral-700);
        }

        /* ===== MAIN LAYOUT ===== */
        .main-wrapper {
            display: grid;
            grid-template-columns: 1fr;
            gap: 24px;
        }

        /* ===== QUIZ INTERFACE ===== */
        .quiz-container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.1);
            padding: 40px;
            display: none;
        }

        .quiz-container.active {
            display: block;
            animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .quiz-header {
            margin-bottom: 32px;
        }

        .quiz-progress {
            margin-bottom: 16px;
        }

        .progress-bar {
            background: var(--neutral-200);
            height: 6px;
            border-radius: 3px;
            overflow: hidden;
        }

        .progress-fill {
            background: linear-gradient(90deg, var(--primary) 0%, var(--primary-light) 100%);
            height: 100%;
            transition: width 0.3s ease;
        }

        .progress-text {
            font-size: 13px;
            color: var(--neutral-500);
            margin-top: 8px;
            font-weight: 500;
        }

        .quiz-title {
            font-size: 28px;
            font-weight: 700;
            color: var(--neutral-900);
            margin-bottom: 8px;
        }

        .quiz-subtitle {
            font-size: 15px;
            color: var(--neutral-500);
        }

        .quiz-section {
            margin-bottom: 40px;
        }

        .section-title {
            font-size: 18px;
            font-weight: 600;
            color: var(--neutral-900);
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 2px solid var(--neutral-200);
        }

        .form-group {
            margin-bottom: 24px;
        }

        .form-label {
            display: block;
            font-size: 14px;
            font-weight: 600;
            color: var(--neutral-700);
            margin-bottom: 8px;
        }

        .form-label .required {
            color: var(--error);
        }

        .form-input, .form-select, .form-textarea {
            width: 100%;
            padding: 12px 14px;
            border: 1.5px solid var(--neutral-300);
            border-radius: 8px;
            font-size: 14px;
            font-family: inherit;
            transition: all 0.2s ease;
            background: white;
        }

        .form-input:focus, .form-select:focus, .form-textarea:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(26, 127, 126, 0.1);
        }

        .form-input::placeholder {
            color: var(--neutral-400);
        }

        .form-textarea {
            resize: vertical;
            min-height: 100px;
        }

        .input-group {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }

        .input-row-3 {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
        }

        /* ===== BUTTONS ===== */
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }

        .btn-primary {
            background: var(--primary);
            color: white;
        }

        .btn-primary:hover {
            background: var(--primary-dark);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(26, 127, 126, 0.3);
        }

        .btn-secondary {
            background: var(--neutral-200);
            color: var(--neutral-900);
        }

        .btn-secondary:hover {
            background: var(--neutral-300);
        }

        .btn-outline {
            background: transparent;
            color: var(--primary);
            border: 1.5px solid var(--primary);
        }

        .btn-outline:hover {
            background: rgba(26, 127, 126, 0.05);
        }

        .btn-full {
            width: 100%;
        }

        .btn-group {
            display: flex;
            gap: 12px;
            margin-top: 32px;
            justify-content: space-between;
        }

        /* ===== DPR EDITOR ===== */
        .dpr-editor {
            display: none;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.1);
            overflow: hidden;
        }

        .dpr-editor.active {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1px;
            background: var(--neutral-300);
            height: calc(100vh - 200px);
        }

        .dpr-editor.active .editor-panel {
            background: white;
            overflow-y: auto;
        }

        .editor-sidebar {
            background: var(--neutral-50);
            padding: 24px;
            border-right: 1px solid var(--neutral-200);
            overflow-y: auto;
        }

        .editor-toolbar {
            display: flex;
            gap: 8px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }

        .toolbar-btn {
            padding: 8px 12px;
            border: 1px solid var(--neutral-300);
            background: white;
            border-radius: 6px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .toolbar-btn:hover {
            background: var(--primary);
            color: white;
            border-color: var(--primary);
        }

        .toolbar-btn.active {
            background: var(--primary);
            color: white;
            border-color: var(--primary);
        }

        .sidebar-section {
            margin-bottom: 24px;
        }

        .sidebar-title {
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            color: var(--neutral-500);
            margin-bottom: 12px;
        }

        .sidebar-item {
            padding: 12px;
            background: white;
            border: 1px solid var(--neutral-200);
            border-radius: 6px;
            margin-bottom: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: 13px;
        }

        .sidebar-item:hover {
            border-color: var(--primary);
            background: rgba(26, 127, 126, 0.05);
        }

        .sidebar-item.active {
            background: rgba(26, 127, 126, 0.1);
            border-color: var(--primary);
            font-weight: 600;
        }

        .editor-main {
            padding: 32px 40px;
            overflow-y: auto;
            background: white;
        }

        .dpr-section {
            margin-bottom: 40px;
            display: none;
        }

        .dpr-section.active {
            display: block;
            animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .dpr-section-title {
            font-size: 22px;
            font-weight: 700;
            color: var(--primary);
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 3px solid var(--primary);
        }

        .edit-field {
            margin-bottom: 20px;
        }

        .edit-field-label {
            font-size: 12px;
            font-weight: 600;
            color: var(--neutral-500);
            text-transform: uppercase;
            margin-bottom: 6px;
        }

        .edit-field-content {
            background: var(--neutral-50);
            padding: 12px;
            border-radius: 6px;
            border: 1px solid var(--neutral-200);
            font-size: 14px;
            color: var(--neutral-900);
            line-height: 1.6;
        }

        .edit-field-content[contenteditable="true"] {
            cursor: text;
            background: white;
            border: 2px solid var(--primary);
        }

        /* ===== IMAGE CARDS ===== */
        .image-card-container {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }

        .image-card {
            position: relative;
            border: 2px dashed var(--neutral-300);
            border-radius: 8px;
            overflow: hidden;
            aspect-ratio: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--neutral-50);
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .image-card:hover {
            border-color: var(--primary);
            background: rgba(26, 127, 126, 0.05);
        }

        .image-card img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .image-card-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            gap: 8px;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.2s ease;
        }

        .image-card:hover .image-card-overlay {
            opacity: 1;
        }

        .image-edit-btn {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: white;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            transition: all 0.2s ease;
        }

        .image-edit-btn:hover {
            transform: scale(1.1);
        }

        /* ===== TABLES & GRAPHS ===== */
        .content-adder {
            display: flex;
            gap: 8px;
            margin-bottom: 20px;
        }

        .table-editor {
            margin-bottom: 24px;
            background: var(--neutral-50);
            padding: 16px;
            border-radius: 8px;
            border: 1px solid var(--neutral-200);
        }

        .table-controls {
            display: flex;
            gap: 8px;
            margin-bottom: 12px;
            flex-wrap: wrap;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border: 1px solid var(--neutral-300);
        }

        th {
            background: var(--primary);
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            font-size: 13px;
        }

        td {
            padding: 12px;
            border-bottom: 1px solid var(--neutral-200);
            font-size: 13px;
        }

        td input {
            width: 100%;
            border: 1px solid var(--neutral-300);
            padding: 6px;
            border-radius: 4px;
            font-size: 13px;
        }

        tr:hover {
            background: var(--neutral-50);
        }

        .graph-placeholder {
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            height: 300px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--neutral-500);
            font-size: 14px;
            margin-bottom: 16px;
        }

        /* ===== MODAL ===== */
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 1000;
            align-items: center;
            justify-content: center;
        }

        .modal.active {
            display: flex;
        }

        .modal-content {
            background: white;
            border-radius: 12px;
            padding: 32px;
            max-width: 500px;
            width: 90%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }

        .modal-header {
            font-size: 20px;
            font-weight: 700;
            color: var(--neutral-900);
            margin-bottom: 16px;
        }

        .modal-close {
            position: absolute;
            top: 16px;
            right: 16px;
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: var(--neutral-500);
        }

        /* ===== RESPONSIVE ===== */
        @media (max-width: 1024px) {
            .dpr-editor.active {
                grid-template-columns: 300px 1fr;
            }
        }

        @media (max-width: 768px) {
            .container {
                padding: 16px;
            }

            .quiz-container {
                padding: 24px;
            }

            .input-group, .input-row-3 {
                grid-template-columns: 1fr;
            }

            .dpr-editor.active {
                grid-template-columns: 1fr;
                height: auto;
            }

            .editor-sidebar {
                border-right: none;
                border-bottom: 1px solid var(--neutral-200);
                max-height: 200px;
            }

            .header {
                flex-direction: column;
                gap: 16px;
                align-items: flex-start;
            }

            .header-progress {
                width: 100%;
            }
        }
    </style>
</head>
<body>
    <!-- HEADER -->
    <div class="header">
        <div class="header-title">
            <h1>🏦 Wealthin DPR</h1>
            <span class="header-badge">Bank Ready</span>
        </div>
        <div class="header-progress">
            <span id="progressText">Step 1 of 8</span>
        </div>
    </div>

    <div class="container">
        <!-- QUIZ INTERFACE -->
        <div class="quiz-container active" id="quizContainer">
            <div class="quiz-header">
                <div class="quiz-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" id="progressBar" style="width: 12.5%"></div>
                    </div>
                    <div class="progress-text"><span id="stepCount">1</span> of 8 Steps</div>
                </div>
                <h2 class="quiz-title" id="quizTitle">Project Information</h2>
                <p class="quiz-subtitle" id="quizSubtitle">Tell us about your MSME project</p>
            </div>

            <form id="quizForm">
                <!-- STEP 1: BASIC PROJECT INFO -->
                <div class="quiz-step" id="step1" style="display: block;">
                    <div class="quiz-section">
                        <div class="section-title">Project Basics</div>
                        <div class="form-group">
                            <label class="form-label">Project Name <span class="required">*</span></label>
                            <input type="text" class="form-input" name="projectName" placeholder="e.g., Textile Manufacturing Unit" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Project Category <span class="required">*</span></label>
                            <select class="form-select" name="projectCategory" required>
                                <option value="">Select Category</option>
                                <option value="manufacturing">Manufacturing</option>
                                <option value="retail">Retail</option>
                                <option value="service">Service</option>
                                <option value="agriculture">Agriculture</option>
                                <option value="ecommerce">E-commerce</option>
                                <option value="food">Food & Beverage</option>
                                <option value="it">IT & Software</option>
                                <option value="construction">Construction</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Project Description <span class="required">*</span></label>
                            <textarea class="form-textarea" name="projectDescription" placeholder="Describe your project in detail..." required></textarea>
                        </div>
                    </div>
                </div>

                <!-- STEP 2: LOCATION & REGISTRATION -->
                <div class="quiz-step" id="step2" style="display: none;">
                    <div class="quiz-section">
                        <div class="section-title">Location & Registration</div>
                        <div class="input-group">
                            <div class="form-group">
                                <label class="form-label">State <span class="required">*</span></label>
                                <select class="form-select" name="state" required>
                                    <option value="">Select State</option>
                                    <option value="AP">Andhra Pradesh</option>
                                    <option value="TS">Telangana</option>
                                    <option value="KA">Karnataka</option>
                                    <option value="TN">Tamil Nadu</option>
                                    <option value="MH">Maharashtra</option>
                                    <option value="UP">Uttar Pradesh</option>
                                    <option value="DL">Delhi</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">City <span class="required">*</span></label>
                                <input type="text" class="form-input" name="city" placeholder="e.g., Hyderabad" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">UDYAM Registration Number <span class="required">*</span></label>
                            <input type="text" class="form-input" name="udyamNumber" placeholder="UDYAM-XX-XX-0000000" required>
                        </div>
                        <div class="input-group">
                            <div class="form-group">
                                <label class="form-label">PAN <span class="required">*</span></label>
                                <input type="text" class="form-input" name="pan" placeholder="XXXXXXXXXX" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">GST Number <span class="required">*</span></label>
                                <input type="text" class="form-input" name="gst" placeholder="XXXXXXXXXXXXXXXXXX" required>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- STEP 3: PROMOTER DETAILS -->
                <div class="quiz-step" id="step3" style="display: none;">
                    <div class="quiz-section">
                        <div class="section-title">Promoter / Entrepreneur Details</div>
                        <div class="input-group">
                            <div class="form-group">
                                <label class="form-label">Full Name <span class="required">*</span></label>
                                <input type="text" class="form-input" name="promoterName" placeholder="Full name" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Age <span class="required">*</span></label>
                                <input type="number" class="form-input" name="promoterAge" placeholder="Age" required>
                            </div>
                        </div>
                        <div class="input-group">
                            <div class="form-group">
                                <label class="form-label">Education <span class="required">*</span></label>
                                <select class="form-select" name="promoterEducation" required>
                                    <option value="">Select</option>
                                    <option value="10th">10th Pass</option>
                                    <option value="12th">12th Pass</option>
                                    <option value="diploma">Diploma</option>
                                    <option value="graduation">Graduation</option>
                                    <option value="post-graduation">Post Graduation</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Experience (Years) <span class="required">*</span></label>
                                <input type="number" class="form-input" name="promoterExperience" placeholder="0" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Contact Number <span class="required">*</span></label>
                            <input type="tel" class="form-input" name="promoterPhone" placeholder="+91" required>
                        </div>
                    </div>
                </div>

                <!-- STEP 4: FINANCIAL REQUIREMENTS -->
                <div class="quiz-step" id="step4" style="display: none;">
                    <div class="quiz-section">
                        <div class="section-title">Project Cost & Financing</div>
                        <div class="form-group">
                            <label class="form-label">Total Project Cost (₹) <span class="required">*</span></label>
                            <input type="number" class="form-input" name="totalProjectCost" placeholder="0" required>
                        </div>
                        <div class="input-row-3">
                            <div class="form-group">
                                <label class="form-label">Land & Building (₹)</label>
                                <input type="number" class="form-input" name="costLandBuilding" placeholder="0">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Machinery (₹)</label>
                                <input type="number" class="form-input" name="costMachinery" placeholder="0">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Working Capital (₹)</label>
                                <input type="number" class="form-input" name="costWorkingCapital" placeholder="0">
                            </div>
                        </div>
                        <div class="input-group">
                            <div class="form-group">
                                <label class="form-label">Promoter Contribution (₹) <span class="required">*</span></label>
                                <input type="number" class="form-input" name="promoterContribution" placeholder="0" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Bank Loan Required (₹) <span class="required">*</span></label>
                                <input type="number" class="form-input" name="bankLoanRequired" placeholder="0" required>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- STEP 5: REVENUE & PROFITABILITY -->
                <div class="quiz-step" id="step5" style="display: none;">
                    <div class="quiz-section">
                        <div class="section-title">Financial Projections</div>
                        <div class="form-group">
                            <label class="form-label">Expected Annual Revenue (Year 1) (₹) <span class="required">*</span></label>
                            <input type="number" class="form-input" name="annualRevenue" placeholder="0" required>
                        </div>
                        <div class="input-group">
                            <div class="form-group">
                                <label class="form-label">Expected Profit Margin (%) <span class="required">*</span></label>
                                <input type="number" class="form-input" name="profitMargin" placeholder="0" step="0.1" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Payback Period (Months) <span class="required">*</span></label>
                                <input type="number" class="form-input" name="paybackPeriod" placeholder="0" required>
                            </div>
                        </div>
                        <div class="input-group">
                            <div class="form-group">
                                <label class="form-label">Break Even (Months) <span class="required">*</span></label>
                                <input type="number" class="form-input" name="breakEven" placeholder="0" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">IRR (%) <span class="required">*</span></label>
                                <input type="number" class="form-input" name="irr" placeholder="0" step="0.1" required>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- STEP 6: MARKET & COMPETITION -->
                <div class="quiz-step" id="step6" style="display: none;">
                    <div class="quiz-section">
                        <div class="section-title">Market Analysis</div>
                        <div class="form-group">
                            <label class="form-label">Target Market <span class="required">*</span></label>
                            <textarea class="form-textarea" name="targetMarket" placeholder="Describe your target market..." required></textarea>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Competitive Advantage <span class="required">*</span></label>
                            <textarea class="form-textarea" name="competitiveAdvantage" placeholder="What makes you unique?" required></textarea>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Market Size & Opportunity <span class="required">*</span></label>
                            <textarea class="form-textarea" name="marketOpportunity" placeholder="Estimated market size and growth potential..." required></textarea>
                        </div>
                    </div>
                </div>

                <!-- STEP 7: RISK & MITIGATION -->
                <div class="quiz-step" id="step7" style="display: none;">
                    <div class="quiz-section">
                        <div class="section-title">Risk Assessment</div>
                        <div class="form-group">
                            <label class="form-label">Potential Risks <span class="required">*</span></label>
                            <textarea class="form-textarea" name="risks" placeholder="Identify key risks..." required></textarea>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Mitigation Strategies <span class="required">*</span></label>
                            <textarea class="form-textarea" name="mitigations" placeholder="How will you mitigate these risks?" required></textarea>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Debt Service Coverage Ratio (DSCR) <span class="required">*</span></label>
                            <input type="number" class="form-input" name="dscr" placeholder="1.25" step="0.01" required>
                        </div>
                    </div>
                </div>

                <!-- STEP 8: MEDIA & IMAGES -->
                <div class="quiz-step" id="step8" style="display: none;">
                    <div class="quiz-section">
                        <div class="section-title">Project Images</div>
                        <p style="color: var(--neutral-500); margin-bottom: 20px; font-size: 13px;">Upload project images: proposed site, equipment, team, etc.</p>
                        <div class="image-card-container" id="imageCardsContainer">
                            <div class="image-card" id="uploadCard1">
                                <input type="file" style="display: none;" accept="image/*" class="image-input">
                                <div style="text-align: center; color: var(--neutral-500);">
                                    <div style="font-size: 24px; margin-bottom: 8px;">📷</div>
                                    <div style="font-size: 12px;">Site Photo</div>
                                </div>
                            </div>
                            <div class="image-card" id="uploadCard2">
                                <input type="file" style="display: none;" accept="image/*" class="image-input">
                                <div style="text-align: center; color: var(--neutral-500);">
                                    <div style="font-size: 24px; margin-bottom: 8px;">⚙️</div>
                                    <div style="font-size: 12px;">Equipment</div>
                                </div>
                            </div>
                            <div class="image-card" id="uploadCard3">
                                <input type="file" style="display: none;" accept="image/*" class="image-input">
                                <div style="text-align: center; color: var(--neutral-500);">
                                    <div style="font-size: 24px; margin-bottom: 8px;">👥</div>
                                    <div style="font-size: 12px;">Team Photo</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- BUTTON GROUP -->
                <div class="btn-group">
                    <button type="button" class="btn btn-secondary" id="prevBtn" style="display: none;">← Previous</button>
                    <button type="button" class="btn btn-primary" id="nextBtn">Next →</button>
                    <button type="button" class="btn btn-primary" id="generateBtn" style="display: none;">🎯 Generate DPR</button>
                </div>
            </form>
        </div>

        <!-- DPR EDITOR -->
        <div class="dpr-editor" id="dprEditor">
            <!-- SIDEBAR -->
            <div class="editor-sidebar">
                <div class="sidebar-section">
                    <div class="sidebar-title">DPR Sections</div>
                    <div class="sidebar-item active" data-section="executive-summary">📋 Executive Summary</div>
                    <div class="sidebar-item" data-section="project-description">🏢 Project Description</div>
                    <div class="sidebar-item" data-section="promoter-details">👤 Promoter Details</div>
                    <div class="sidebar-item" data-section="technical-details">⚙️ Technical Details</div>
                    <div class="sidebar-item" data-section="financial-details">💰 Financial Details</div>
                    <div class="sidebar-item" data-section="market-analysis">📊 Market Analysis</div>
                    <div class="sidebar-item" data-section="risk-analysis">⚠️ Risk Analysis</div>
                </div>

                <div class="sidebar-section">
                    <div class="sidebar-title">Tools</div>
                    <div class="toolbar-btn" onclick="addTable()">+ Table</div>
                    <div class="toolbar-btn" onclick="addGraph()">+ Graph</div>
                    <div class="toolbar-btn" onclick="downloadDPR()">⬇️ Download</div>
                    <div class="toolbar-btn" onclick="previewDPR()">👁️ Preview</div>
                </div>
            </div>

            <!-- MAIN EDITOR -->
            <div class="editor-panel">
                <div class="editor-main">
                    <!-- EXECUTIVE SUMMARY -->
                    <div class="dpr-section active" id="executive-summary">
                        <div class="dpr-section-title">Executive Summary</div>
                        <div class="edit-field">
                            <div class="edit-field-label">Project Overview</div>
                            <div class="edit-field-content" contenteditable="true"></div>
                        </div>
                        <div class="edit-field">
                            <div class="edit-field-label">Financial Highlights</div>
                            <div class="edit-field-content" contenteditable="true"></div>
                        </div>
                    </div>

                    <!-- PROJECT DESCRIPTION -->
                    <div class="dpr-section" id="project-description">
                        <div class="dpr-section-title">Project Description</div>
                        <div class="edit-field">
                            <div class="edit-field-label">Project Overview</div>
                            <div class="edit-field-content" contenteditable="true"></div>
                        </div>
                        <div class="edit-field">
                            <div class="edit-field-label">Location</div>
                            <div class="edit-field-content" contenteditable="true"></div>
                        </div>
                        <div style="margin: 20px 0;">
                            <div class="image-card-container">
                                <div class="image-card">
                                    <input type="file" style="display: none;" accept="image/*" class="image-input">
                                    <div style="text-align: center; color: var(--neutral-500);">+</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- PROMOTER DETAILS -->
                    <div class="dpr-section" id="promoter-details">
                        <div class="dpr-section-title">Promoter / Entrepreneur Details</div>
                        <div class="edit-field">
                            <div class="edit-field-label">Name & Background</div>
                            <div class="edit-field-content" contenteditable="true"></div>
                        </div>
                        <div class="edit-field">
                            <div class="edit-field-label">Experience & Qualification</div>
                            <div class="edit-field-content" contenteditable="true"></div>
                        </div>
                    </div>

                    <!-- TECHNICAL DETAILS -->
                    <div class="dpr-section" id="technical-details">
                        <div class="dpr-section-title">Technical Details</div>
                        <div class="edit-field">
                            <div class="edit-field-label">Technology & Equipment</div>
                            <div class="edit-field-content" contenteditable="true"></div>
                        </div>
                        <div class="edit-field">
                            <div class="edit-field-label">Production Capacity</div>
                            <div class="edit-field-content" contenteditable="true"></div>
                        </div>
                        <div style="margin: 20px 0;">
                            <div class="graph-placeholder">Chart/Graph placeholder - will be populated with actual data</div>
                        </div>
                    </div>

                    <!-- FINANCIAL DETAILS -->
                    <div class="dpr-section" id="financial-details">
                        <div class="dpr-section-title">Financial Details & Projections</div>
                        <div class="table-editor">
                            <div class="table-controls">
                                <button class="toolbar-btn" onclick="addTableRow(this)">+ Row</button>
                                <button class="toolbar-btn" onclick="removeTableRow(this)">- Row</button>
                            </div>
                            <table id="projectCostTable">
                                <thead>
                                    <tr>
                                        <th>Cost Head</th>
                                        <th>Amount (₹)</th>
                                        <th>% of Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><input type="text" value="Land & Building" placeholder="Enter cost head"></td>
                                        <td><input type="number" placeholder="0"></td>
                                        <td contenteditable="false" style="background: var(--neutral-100);">0%</td>
                                    </tr>
                                    <tr>
                                        <td><input type="text" value="Machinery & Equipment" placeholder="Enter cost head"></td>
                                        <td><input type="number" placeholder="0"></td>
                                        <td contenteditable="false" style="background: var(--neutral-100);">0%</td>
                                    </tr>
                                    <tr>
                                        <td><input type="text" value="Working Capital" placeholder="Enter cost head"></td>
                                        <td><input type="number" placeholder="0"></td>
                                        <td contenteditable="false" style="background: var(--neutral-100);">0%</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div class="edit-field">
                            <div class="edit-field-label">Revenue Projections</div>
                            <div class="edit-field-content" contenteditable="true"></div>
                        </div>
                        <div style="margin: 20px 0;">
                            <div class="graph-placeholder">Revenue Projection Chart - Connect to AI charting service</div>
                        </div>
                    </div>

                    <!-- MARKET ANALYSIS -->
                    <div class="dpr-section" id="market-analysis">
                        <div class="dpr-section-title">Market Analysis</div>
                        <div class="edit-field">
                            <div class="edit-field-label">Target Market</div>
                            <div class="edit-field-content" contenteditable="true"></div>
                        </div>
                        <div class="edit-field">
                            <div class="edit-field-label">Competitive Advantage</div>
                            <div class="edit-field-content" contenteditable="true"></div>
                        </div>
                        <div style="margin: 20px 0;">
                            <div class="graph-placeholder">Market Share Chart - AI generated from market data</div>
                        </div>
                    </div>

                    <!-- RISK ANALYSIS -->
                    <div class="dpr-section" id="risk-analysis">
                        <div class="dpr-section-title">Risk Analysis & Mitigation</div>
                        <div class="table-editor">
                            <div class="table-controls">
                                <button class="toolbar-btn" onclick="addTableRow(this)">+ Row</button>
                            </div>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Risk Factor</th>
                                        <th>Impact</th>
                                        <th>Mitigation Strategy</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><input type="text" placeholder="Enter risk"></td>
                                        <td><select style="width: 100%; padding: 6px;"><option>High</option><option>Medium</option><option>Low</option></select></td>
                                        <td><input type="text" placeholder="Enter mitigation"></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div class="edit-field">
                            <div class="edit-field-label">DSCR & Repayment Capacity</div>
                            <div class="edit-field-content" contenteditable="true"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // ========================================
        // STATE MANAGEMENT
        // ========================================
        const state = {
            currentStep: 1,
            totalSteps: 8,
            formData: {},
            dprData: {},
            images: {}
        };

        // ========================================
        // QUIZ NAVIGATION
        // ========================================
        const quizForm = document.getElementById('quizForm');
        const nextBtn = document.getElementById('nextBtn');
        const prevBtn = document.getElementById('prevBtn');
        const generateBtn = document.getElementById('generateBtn');

        nextBtn.addEventListener('click', () => nextStep());
        prevBtn.addEventListener('click', () => prevStep());
        generateBtn.addEventListener('click', () => generateDPR());

        function validateStep(stepNum) {
            const step = document.getElementById(\`step\${stepNum}\`);
            const inputs = step.querySelectorAll('input[required], textarea[required], select[required]');
            let isValid = true;

            inputs.forEach(input => {
                if (!input.value.trim()) {
                    input.style.borderColor = 'var(--error)';
                    isValid = false;
                } else {
                    input.style.borderColor = '';
                }
            });

            return isValid;
        }

        function nextStep() {
            if (!validateStep(state.currentStep)) {
                alert('Please fill all required fields before proceeding.');
                return;
            }

            saveStepData(state.currentStep);

            if (state.currentStep < state.totalSteps) {
                showStep(state.currentStep + 1);
            }
        }

        function prevStep() {
            if (state.currentStep > 1) {
                showStep(state.currentStep - 1);
            }
        }

        function showStep(stepNum) {
            document.querySelectorAll('.quiz-step').forEach(step => step.style.display = 'none');
            const currentStepEl = document.getElementById(\`step\${stepNum}\`);
            if(currentStepEl) currentStepEl.style.display = 'block';

            state.currentStep = stepNum;
            updateProgress();
            updateButtons();

            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        function updateProgress() {
            const progressPercent = (state.currentStep / state.totalSteps) * 100;
            document.getElementById('progressBar').style.width = progressPercent + '%';
            document.getElementById('stepCount').textContent = state.currentStep;
            document.getElementById('progressText').textContent = \`Step \${state.currentStep} of \${state.totalSteps}\`;

            const titles = [
                'Project Information',
                'Location & Registration',
                'Promoter Details',
                'Financial Requirements',
                'Revenue & Profitability',
                'Market & Competition',
                'Risk Assessment',
                'Project Images'
            ];
            
            const quizTitleEl = document.getElementById('quizTitle');
            if (quizTitleEl) {
              quizTitleEl.textContent = titles[state.currentStep - 1];
            }
        }

        function updateButtons() {
            prevBtn.style.display = state.currentStep > 1 ? 'inline-flex' : 'none';
            nextBtn.style.display = state.currentStep < state.totalSteps ? 'inline-flex' : 'none';
            generateBtn.style.display = state.currentStep === state.totalSteps ? 'inline-flex' : 'none';
        }

        function saveStepData(stepNum) {
            const step = document.getElementById(\`step\${stepNum}\`);
            const inputs = step.querySelectorAll('input, textarea, select');

            inputs.forEach(input => {
                if (input.name) {
                    state.formData[input.name] = input.value;
                }
            });
            console.log(\`Step \${stepNum} data saved:\`, state.formData);
        }

        // ========================================
        // IMAGE UPLOAD HANDLING
        // ========================================
        document.querySelectorAll('.image-card').forEach(card => {
            card.addEventListener('click', function() {
                const input = this.querySelector('.image-input');
                if (input) input.click();
            });

            const input = card.querySelector('.image-input');
            if (input) {
                input.addEventListener('change', function(e) {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = function(event) {
                            const img = document.createElement('img');
                            img.src = event.target.result;
                            card.innerHTML = '';
                            card.appendChild(img);
                            card.style.backgroundImage = 'none';
                        };
                        reader.readAsDataURL(file);
                    }
                });
            }
        });

        // ========================================
        // DPR GENERATION & EDITOR
        // ========================================
        function generateDPR() {
            saveStepData(state.totalSteps);

            console.log('Generating DPR with data:', state.formData);
            
            // Mock AI Response
            const dprContent = {
                executiveSummary: \`This DPR outlines the establishment of \${state.formData.projectName}, a \${state.formData.projectCategory} enterprise in \${state.formData.city}, \${state.formData.state}. With a total project cost of ₹\${state.formData.totalProjectCost} and promoter contribution of ₹\${state.formData.promoterContribution}, the venture projects a first-year revenue of ₹\${state.formData.annualRevenue}.\`,
                financialHighlights: \`Projected Profit Margin: \${state.formData.profitMargin}%. Payback Period: \${state.formData.paybackPeriod} months. DSCR: \${state.formData.dscr}.\`,
                projectDescription: state.formData.projectDescription,
                location: \`\${state.formData.city}, \${state.formData.state}\`,
                promoterBackground: \`The project is led by \${state.formData.promoterName}, aged \${state.formData.promoterAge}, with \${state.formData.promoterExperience} years of relevant experience.\`,
                technicalDetails: \`The project will utilize modern technology and equipment suitable for the \${state.formData.projectCategory} industry.\`,
                marketAnalysis: state.formData.targetMarket,
                competitiveAdvantage: state.formData.competitiveAdvantage,
            };

            populateDPREditor(dprContent);
            showDPREditor();
        }

        function populateDPREditor(dprContent) {
            document.querySelector('#executive-summary .edit-field-content').innerHTML = dprContent.executiveSummary;
            document.querySelectorAll('#executive-summary .edit-field-content')[1].innerHTML = dprContent.financialHighlights;
            
            document.querySelector('#project-description .edit-field-content').innerHTML = dprContent.projectDescription;
            document.querySelectorAll('#project-description .edit-field-content')[1].innerHTML = dprContent.location;

            document.querySelector('#promoter-details .edit-field-content').innerHTML = dprContent.promoterBackground;
            
            document.querySelector('#technical-details .edit-field-content').innerHTML = dprContent.technicalDetails;

            document.querySelector('#market-analysis .edit-field-content').innerHTML = dprContent.marketAnalysis;
            document.querySelectorAll('#market-analysis .edit-field-content')[1].innerHTML = dprContent.competitiveAdvantage;
        }

        function showDPREditor() {
            document.getElementById('quizContainer').classList.remove('active');
            document.getElementById('dprEditor').classList.add('active');
            document.querySelector('.header').style.display = 'none'; // Hide header in editor view
        }

        // ========================================
        // SECTION NAVIGATION IN EDITOR
        // ========================================
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.addEventListener('click', function() {
                const sectionId = this.getAttribute('data-section');

                document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
                this.classList.add('active');

                document.querySelectorAll('.dpr-section').forEach(section => section.classList.remove('active'));
                document.getElementById(sectionId).classList.add('active');
            });
        });
        
        function downloadDPR() { alert('Download functionality to be implemented.'); }
        function previewDPR() { alert('Preview functionality to be implemented.'); }
        function addTable() { alert('Add table functionality to be implemented.'); }
        function addGraph() { alert('Add graph functionality to be implemented.'); }
        function addTableRow(btn) {}
        function removeTableRow(btn) {}

        // Initialize
        updateProgress();
        updateButtons();
    </script>
</body>
</html>
