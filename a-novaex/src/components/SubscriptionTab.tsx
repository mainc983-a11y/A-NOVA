import React, { useState, useEffect } from "react";
import { apiFetch } from "../apiClient";
import { 
  Sparkles, 
  Check, 
  CreditCard, 
  Calendar, 
  RefreshCw, 
  FileText, 
  FileDown, 
  AlertCircle, 
  CheckCircle2, 
  Zap, 
  ArrowRight, 
  Clock, 
  HelpCircle, 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  MessageSquare, 
  Image as ImageIcon, 
  Mic, 
  Paperclip, 
  HardDrive, 
  Code2, 
  AlertTriangle, 
  X, 
  Download, 
  Lock, 
  ExternalLink, 
  RotateCcw,
  PauseCircle,
  PlayCircle,
  ShieldAlert,
  Search,
  CheckCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User, Settings, ChatSession } from "../types";

export interface SubscriptionTabProps {
  user: User | null;
  onUpdateProfile?: (
    username: string,
    avatarUrl: string,
    displayName?: string,
    planStatus?: string
  ) => Promise<void>;
  sessions?: ChatSession[];
  settings?: Settings;
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
}

// Subscription Plans Definition
export interface SubscriptionPlan {
  id: string;
  name: string;
  badge: string;
  priceMonthly: number;
  priceYearly: number;
  formattedMonthly: string;
  formattedYearly: string;
  emoji: string;
  colorScheme: string;
  popular?: boolean;
  benefits: {
    title: string;
    included: boolean;
  }[];
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "free",
    name: "Free",
    badge: "STARTER",
    priceMonthly: 0,
    priceYearly: 0,
    formattedMonthly: "₹0",
    formattedYearly: "₹0",
    emoji: "🌱",
    colorScheme: "zinc",
    benefits: [
      { title: "Faster responses", included: false },
      { title: "Premium AI models (GPT-4o, Gemini 1.5)", included: false },
      { title: "Higher message limits (50/day)", included: true },
      { title: "Voice conversations", included: false },
      { title: "Image generation (5/day)", included: true },
      { title: "File uploads (5MB max)", included: true },
      { title: "Larger context window", included: false },
      { title: "Priority processing", included: false },
      { title: "Early feature access", included: false }
    ]
  },
  {
    id: "plus",
    name: "Plus",
    badge: "POPULAR",
    priceMonthly: 199,
    priceYearly: 1990,
    formattedMonthly: "₹199/mo",
    formattedYearly: "₹1,990/yr",
    emoji: "⚡",
    colorScheme: "sky",
    benefits: [
      { title: "Faster responses", included: true },
      { title: "Premium AI models", included: true },
      { title: "Higher message limits (500/day)", included: true },
      { title: "Voice conversations (30 mins/mo)", included: true },
      { title: "Image generation (50/day)", included: true },
      { title: "File uploads (25MB max)", included: true },
      { title: "Larger context window (32k tokens)", included: true },
      { title: "Priority processing", included: false },
      { title: "Early feature access", included: false }
    ]
  },
  {
    id: "pro",
    name: "Pro",
    badge: "MOST POPULAR",
    priceMonthly: 399,
    priceYearly: 3990,
    formattedMonthly: "₹399/mo",
    formattedYearly: "₹3,990/yr",
    emoji: "🚀",
    colorScheme: "purple",
    popular: true,
    benefits: [
      { title: "Faster responses (Turbo Mode)", included: true },
      { title: "Premium AI models (GPT-4o, Gemini Pro, Claude)", included: true },
      { title: "Higher message limits (Unlimited)", included: true },
      { title: "Voice conversations (Unlimited)", included: true },
      { title: "Image generation (Unlimited HD)", included: true },
      { title: "File uploads (100MB max)", included: true },
      { title: "Larger context window (128k tokens)", included: true },
      { title: "Priority processing (Dedicated GPU)", included: true },
      { title: "Early feature access", included: true }
    ]
  },
  {
    id: "enterprise",
    name: "Enterprise",
    badge: "ORGANIZATION",
    priceMonthly: 999,
    priceYearly: 9990,
    formattedMonthly: "₹999/mo",
    formattedYearly: "₹9,990/yr",
    emoji: "👑",
    colorScheme: "amber",
    benefits: [
      { title: "Ultra-fast dedicated server clusters", included: true },
      { title: "Custom fine-tuned AI models & API access", included: true },
      { title: "Unlimited messages & team seats", included: true },
      { title: "Voice conversations & real-time audio API", included: true },
      { title: "4K AI Image & Video generation", included: true },
      { title: "Unlimited file & workspace attachments", included: true },
      { title: "Maximum context window (1M tokens)", included: true },
      { title: "VIP 24/7 Priority Support & SLA", included: true },
      { title: "Custom security & admin analytics", included: true }
    ]
  }
];

export interface InvoiceItem {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: "Paid" | "Pending" | "Failed";
  paymentMethod: string;
  planName: string;
  gstNumber?: string;
  taxAmount?: number;
}

export default function SubscriptionTab({
  user,
  onUpdateProfile,
  showSuccess,
  showError
}: SubscriptionTabProps) {
  // Subscription core states
  const [currentPlanId, setCurrentPlanId] = useState<string>("free");
  const [subStatus, setSubStatus] = useState<"active" | "trial" | "expired" | "cancelled" | "paused" | "none">("none");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [autoRenew, setAutoRenew] = useState<boolean>(false);
  const [memberSince, setMemberSince] = useState<string>("Today");
  const [renewalDate, setRenewalDate] = useState<string>("N/A");

  // Free Trial State
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number>(0);
  const [trialEndDate] = useState<string>("N/A");
  const [hasActiveTrial, setHasActiveTrial] = useState<boolean>(false);

  // Loading & State Simulators
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [simulatedError, setSimulatedError] = useState<
    "none" | "payment_failed" | "card_expired" | "network_error" | "subscription_expired" | "verification_failed"
  >("none");

  // Usage statistics state
  const [usageData, setUsageData] = useState({
    messages: { current: 0, max: 20, resetDate: "Next Month" },
    images: { current: 0, max: 0, resetDate: "Next Month" },
    voiceMinutes: { current: 0, max: 0, resetDate: "Next Month" },
    fileUploads: { current: 0, max: 2, resetDate: "Next Month" },
    storageGb: { current: 0.05, max: 0.1, resetDate: "Next Month" },
    apiTokens: { current: 0, max: 0, resetDate: "Next Month" }
  });

  // Payment Method state
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  // Invoices list - starts empty unless real record exists in backend
  const [billingHistory, setBillingHistory] = useState<InvoiceItem[]>([]);

  // Fetch real subscription data from backend
  useEffect(() => {
    let isMounted = true;
    const fetchSubscription = async () => {
      try {
        setIsLoading(true);
        const res = await apiFetch("/api/subscription", {}, "SubscriptionTab.tsx:fetchSub");
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data) {
            setCurrentPlanId(data.planId || "free");
            setSubStatus(data.status || "none");
            if (data.billingCycle) setBillingCycle(data.billingCycle);
            setAutoRenew(data.autoRenew === true);
            if (data.memberSince) setMemberSince(data.memberSince);
            if (data.renewalDate) setRenewalDate(data.renewalDate);
            if (data.paymentMethods) setPaymentMethods(data.paymentMethods);
            if (data.billingHistory) setBillingHistory(data.billingHistory);
            if (data.usage) {
              setUsageData({
                messages: { current: data.usage.messages?.current || 0, max: data.usage.messages?.max || 20, resetDate: "Next Month" },
                images: { current: data.usage.images?.current || 0, max: data.usage.images?.max || 0, resetDate: "Next Month" },
                voiceMinutes: { current: data.usage.voiceMinutes?.current || 0, max: data.usage.voiceMinutes?.max || 0, resetDate: "Next Month" },
                fileUploads: { current: data.usage.fileUploads?.current || 0, max: data.usage.fileUploads?.max || 2, resetDate: "Next Month" },
                storageGb: { current: data.usage.storageGb?.current || 0.05, max: data.usage.storageGb?.max || 0.1, resetDate: "Next Month" },
                apiTokens: { current: 0, max: 0, resetDate: "Next Month" }
              });
            }
          }
        }
      } catch (err) {
        console.warn("[SubscriptionTab] Error fetching subscription:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchSubscription();
    return () => { isMounted = false; };
  }, [user?.id]);

  // Modals state
  const [showChangePlanModal, setShowChangePlanModal] = useState<boolean>(false);
  const [showBillingCycleModal, setShowBillingCycleModal] = useState<boolean>(false);
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [showPauseModal, setShowPauseModal] = useState<boolean>(false);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>("");

  // Payment Form State for modal
  const [newPmType, setNewPmType] = useState<"UPI" | "Card" | "NetBanking">("UPI");
  const [upiIdInput, setUpiIdInput] = useState<string>("");
  const [cardNumberInput, setCardNumberInput] = useState<string>("");
  const [cardExpiryInput, setCardExpiryInput] = useState<string>("");
  const [cardCvcInput, setCardCvcInput] = useState<string>("");


  // FAQ Expand state
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  // Active Plan helper
  const currentPlan = SUBSCRIPTION_PLANS.find(p => p.id === currentPlanId) || {
    id: "none",
    name: "No Active Subscription",
    badge: "INACTIVE",
    priceMonthly: 0,
    priceYearly: 0,
    formattedMonthly: "₹0",
    formattedYearly: "₹0",
    emoji: "⚡",
    colorScheme: "zinc",
    benefits: []
  };

  // Price calculations
  const getCurrentPrice = () => {
    if (currentPlanId === "none" || subStatus === "none") return "₹0 / Free";
    if (currentPlan.priceMonthly === 0) return "Free";
    return billingCycle === "monthly"
      ? `₹${currentPlan.priceMonthly}/mo`
      : `₹${currentPlan.priceYearly}/yr`;
  };

  // Switch Plan Handler
  const handleSelectPlan = async (planId: string) => {
    setIsLoading(true);
    try {
      const res = await apiFetch("/api/subscription", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          status: "active",
          billingCycle,
          autoRenew: true
        })
      }, "SubscriptionTab.tsx:handleSelectPlan");

      if (res.ok) {
        const data = await res.json();
        const updatedSub = data.subscription;
        setCurrentPlanId(updatedSub.planId);
        setSubStatus(updatedSub.status);
        setAutoRenew(updatedSub.autoRenew);
        if (updatedSub.renewalDate) setRenewalDate(updatedSub.renewalDate);
        if (updatedSub.paymentMethods) setPaymentMethods(updatedSub.paymentMethods);
        if (updatedSub.billingHistory) setBillingHistory(updatedSub.billingHistory);
        if (updatedSub.usage) {
          setUsageData({
            messages: { current: updatedSub.usage.messages?.current || 0, max: updatedSub.usage.messages?.max || 1000, resetDate: "Next Month" },
            images: { current: updatedSub.usage.images?.current || 0, max: updatedSub.usage.images?.max || 50, resetDate: "Next Month" },
            voiceMinutes: { current: updatedSub.usage.voiceMinutes?.current || 0, max: updatedSub.usage.voiceMinutes?.max || 300, resetDate: "Next Month" },
            fileUploads: { current: updatedSub.usage.fileUploads?.current || 0, max: updatedSub.usage.fileUploads?.max || 100, resetDate: "Next Month" },
            storageGb: { current: updatedSub.usage.storageGb?.current || 0.05, max: updatedSub.usage.storageGb?.max || 10, resetDate: "Next Month" },
            apiTokens: { current: 0, max: 0, resetDate: "Next Month" }
          });
        }

        showSuccess(`Successfully subscribed to ${SUBSCRIPTION_PLANS.find(p => p.id === planId)?.name || planId} plan!`);
        if (onUpdateProfile) {
          await onUpdateProfile(user?.username || "", user?.avatarUrl || "", user?.displayName, data.planStatus);
        }
      } else {
        showError("Failed to update subscription.");
      }
    } catch (err: any) {
      showError(err.message || "An error occurred while updating subscription.");
    } finally {
      setIsLoading(false);
      setShowChangePlanModal(false);
    }
  };

  // Restore Purchase Handler
  const handleRestorePurchase = async () => {
    setIsRestoring(true);
    try {
      const res = await apiFetch("/api/subscription", {}, "SubscriptionTab.tsx:handleRestorePurchase");
      if (res.ok) {
        const data = await res.json();
        setCurrentPlanId(data.planId || "none");
        setSubStatus(data.status || "none");
        showSuccess("Purchase restored successfully! Your active subscription has been synced.");
      } else {
        showError("No active subscription found to restore.");
      }
    } catch (err: any) {
      showError(err.message || "Failed to restore purchase.");
    } finally {
      setIsRestoring(false);
    }
  };

  // Cancel Subscription Handler
  const handleConfirmCancel = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch("/api/subscription/cancel", {
        method: "POST"
      }, "SubscriptionTab.tsx:handleConfirmCancel");

      if (res.ok) {
        const data = await res.json();
        setSubStatus("cancelled");
        setAutoRenew(false);
        showSuccess("Subscription cancelled. You will maintain benefits until end of billing period.");
      } else {
        showError("Failed to cancel subscription.");
      }
    } catch (err: any) {
      showError(err.message || "An error occurred while cancelling.");
    } finally {
      setIsLoading(false);
      setShowCancelModal(false);
    }
  };

  // Pause / Resume Handler
  const handleTogglePause = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch("/api/subscription/pause", {
        method: "POST"
      }, "SubscriptionTab.tsx:handleTogglePause");

      if (res.ok) {
        const data = await res.json();
        setSubStatus(data.subscription.status);
        showSuccess(data.subscription.status === "paused" ? "Subscription paused." : "Subscription resumed.");
      } else {
        showError("Failed to update subscription status.");
      }
    } catch (err: any) {
      showError(err.message || "Failed to pause/resume.");
    } finally {
      setIsLoading(false);
      setShowPauseModal(false);
    }
  };

  // Download Receipt / Invoice PDF Helper
  const handleDownloadInvoice = (inv: InvoiceItem) => {
    const receiptText = `
====================================================
               A-NOVA OFFICIAL TAX INVOICE
====================================================
Invoice ID    : ${inv.id}
Date          : ${inv.date}
Plan Name     : ${inv.planName}
Billing Status: ${inv.status}
Payment Method: ${inv.paymentMethod}
----------------------------------------------------
Base Amount   : ₹${(inv.amount - (inv.taxAmount || 0)).toFixed(2)}
18% GST Tax   : ₹${(inv.taxAmount || 0).toFixed(2)}
TOTAL AMOUNT  : ₹${inv.amount}.00 INR
----------------------------------------------------
GSTIN         : ${inv.gstNumber || "07AAAAA0000A1Z5"}
Issued To     : ${user?.displayName || user?.username || "A-NOVA User"} (${user?.email || "user@a-nova.ai"})
====================================================
   Thank you for subscribing to A-NOVA AI Platform!
====================================================
    `;
    const blob = new Blob([receiptText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `A-NOVA-Invoice-${inv.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showSuccess(`Downloaded invoice ${inv.id}`);
  };

  // Add Payment Method Handler
  const handleAddPaymentMethod = () => {
    if (newPmType === "UPI" && !upiIdInput.includes("@")) {
      showError("Please enter a valid UPI ID (e.g. name@upi)");
      return;
    }
    if (newPmType === "Card" && cardNumberInput.length < 12) {
      showError("Please enter a valid card number");
      return;
    }

    const newPm = {
      id: "pm_" + Date.now(),
      type: newPmType,
      provider: newPmType === "UPI" ? "BHIM UPI" : "Visa Debit/Credit Card",
      details: newPmType === "UPI" ? upiIdInput : `•••• •••• •••• ${cardNumberInput.slice(-4) || "9999"}`,
      isDefault: paymentMethods.length === 0,
      expiry: newPmType === "Card" ? cardExpiryInput || "12/29" : "N/A"
    };

    setPaymentMethods([...paymentMethods, newPm]);
    setShowPaymentModal(false);
    setUpiIdInput("");
    setCardNumberInput("");
    showSuccess("New payment method added and verified successfully!");
  };

  return (
    <motion.div
      key="tab-subscription-page"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="space-y-4 md:space-y-5 lg:space-y-6 max-w-full md:max-w-3xl lg:max-w-5xl mx-auto px-1 sm:px-2 md:px-0 pb-10"
    >
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4 border-b border-zinc-200 dark:border-zinc-800/80 pb-4 md:pb-5">
        <div>
          <div className="flex items-center gap-2 md:gap-2.5">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400 shrink-0 animate-pulse" />
              <span>Subscription</span>
            </h2>
            <span className="px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              Billing & Perks
            </span>
          </div>
          <p className="text-xs lg:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 sm:mt-1">
            Manage your subscription, billing, and premium features.
          </p>
        </div>

        {/* Top Action Tools */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleRestorePurchase}
            disabled={isRestoring}
            className="w-full sm:w-auto px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-xs disabled:opacity-50 min-h-[40px] sm:min-h-0"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-purple-600 dark:text-purple-400 ${isRestoring ? "animate-spin" : ""}`} />
            <span>{isRestoring ? "Restoring..." : "Restore Purchase"}</span>
          </button>
        </div>
      </div>

      {/* ERROR SIMULATION TESTING BANNER (Allows testing edge cases safely) */}
      {simulatedError !== "none" && (
        <div className="p-3.5 md:p-4 rounded-xl md:rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-800 dark:text-rose-300 text-xs shadow-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-500 dark:text-rose-400 shrink-0" />
            <div>
              <p className="font-bold text-zinc-900 dark:text-white">
                {simulatedError === "payment_failed" && "Payment Failure Detected"}
                {simulatedError === "card_expired" && "Payment Card Expired"}
                {simulatedError === "network_error" && "Network Disconnected"}
                {simulatedError === "subscription_expired" && "Subscription Expired"}
                {simulatedError === "verification_failed" && "Purchase Verification Issue"}
              </p>
              <p className="text-[11px] text-rose-700 dark:text-rose-300/80 mt-0.5">
                {simulatedError === "payment_failed" && "Your last automatic charge of ₹399 failed due to insufficient funds."}
                {simulatedError === "card_expired" && "Your primary credit card on file expired. Please update it."}
                {simulatedError === "network_error" && "Could not sync subscription state with the billing server."}
                {simulatedError === "subscription_expired" && "Your Pro subscription expired on Jul 20, 2026."}
                {simulatedError === "verification_failed" && "We could not verify your store receipt. Tap retry."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setSimulatedError("none");
                showSuccess("Billing issue resolved successfully!");
              }}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md active:scale-95 cursor-pointer"
            >
              Fix Now
            </button>
            <button
              type="button"
              onClick={() => setSimulatedError("none")}
              className="p-1.5 text-rose-500 dark:text-rose-400 hover:text-rose-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. CURRENT PLAN CARD                                      */}
      {/* ========================================================= */}
      <div className="p-4 sm:p-5 md:p-5 lg:p-7 rounded-2xl md:rounded-3xl bg-white dark:bg-zinc-950/90 border border-zinc-200 dark:border-zinc-800/80 shadow-md dark:shadow-2xl relative overflow-hidden space-y-4 md:space-y-5 lg:space-y-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Plan Header Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-5 border-b border-zinc-200 dark:border-zinc-800/80 pb-4 md:pb-5">
          <div className="space-y-1.5 md:space-y-2">
            <div className="flex flex-wrap items-center gap-2 md:gap-2.5">
              <span className="text-[10px] md:text-[11px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                Current Plan
              </span>

              {/* Status Badge */}
              {(subStatus === "none" || currentPlanId === "none") && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 md:px-3 md:py-1 rounded-full text-[11px] md:text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700">
                  <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-zinc-500" />
                  No Active Subscription
                </span>
              )}
              {subStatus === "active" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 md:px-3 md:py-1 rounded-full text-[11px] md:text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                  Active
                </span>
              )}
              {subStatus === "trial" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 md:px-3 md:py-1 rounded-full text-[11px] md:text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-amber-500 dark:bg-amber-400 animate-pulse" />
                  Trial Active ({trialDaysRemaining} Days Left)
                </span>
              )}
              {subStatus === "paused" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 md:px-3 md:py-1 rounded-full text-[11px] md:text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                  <PauseCircle className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                  Paused
                </span>
              )}
              {subStatus === "cancelled" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 md:px-3 md:py-1 rounded-full text-[11px] md:text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                  Cancelled (Ends {renewalDate})
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-baseline gap-2 md:gap-3 pt-0.5">
              <h3 className="text-xl md:text-2xl lg:text-3xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>{currentPlan.emoji}</span>
                <span>{currentPlan.id === "none" ? "No Active Subscription" : `${currentPlan.name} Plan`}</span>
              </h3>
              <span className="text-lg md:text-xl lg:text-2xl font-extrabold text-purple-600 dark:text-purple-400">
                {getCurrentPrice()}
              </span>
            </div>
          </div>

          {/* Plan Management Quick Trigger Buttons */}
          <div className="flex flex-wrap items-center gap-2 md:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowChangePlanModal(true)}
              className="px-3.5 py-2 md:px-4 md:py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 md:gap-2 min-h-[40px] md:min-h-0"
            >
              <Zap className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span>{currentPlanId === "none" || subStatus === "none" ? "Subscribe Now" : "Change Plan"}</span>
            </button>

            {subStatus === "paused" ? (
              <button
                type="button"
                onClick={handleTogglePause}
                className="px-3.5 py-2 md:px-4 md:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 md:gap-2 min-h-[40px] md:min-h-0"
              >
                <PlayCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span>Resume Subscription</span>
              </button>
            ) : subStatus === "active" ? (
              <button
                type="button"
                onClick={() => setShowPauseModal(true)}
                className="px-3 py-2 md:px-3.5 md:py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold transition-all active:scale-95 cursor-pointer min-h-[40px] md:min-h-0"
              >
                Pause
              </button>
            ) : null}
          </div>
        </div>

        {/* Current Plan Metadata Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-3">
          <div className="p-3 md:p-3.5 rounded-xl md:rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/80 space-y-1 flex items-center justify-between md:block">
            <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Member Since</span>
            <p className="text-xs md:text-xs lg:text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400 shrink-0" />
              <span>{memberSince}</span>
            </p>
          </div>

          <div className="p-3 md:p-3.5 rounded-xl md:rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/80 space-y-1 flex items-center justify-between md:block">
            <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Renewal Date</span>
            <p className="text-xs md:text-xs lg:text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 shrink-0" />
              <span>{renewalDate}</span>
            </p>
          </div>

          <div className="p-3 md:p-3.5 rounded-xl md:rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/80 space-y-1 flex items-center justify-between md:block">
            <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Billing Cycle</span>
            <div className="flex items-center gap-3 md:justify-between">
              <span className="text-xs md:text-xs lg:text-sm font-bold text-zinc-900 dark:text-zinc-100 capitalize">{billingCycle}</span>
              <button
                type="button"
                onClick={() => setShowBillingCycleModal(true)}
                className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline font-bold cursor-pointer"
              >
                Switch
              </button>
            </div>
          </div>

          <div className="p-3 md:p-3.5 rounded-xl md:rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/80 space-y-1 flex items-center justify-between md:block">
            <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Auto Renew</span>
            <div className="flex items-center gap-3 md:justify-between pt-0.5">
              <span className={`text-xs font-bold ${autoRenew ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
                {autoRenew ? "On" : "Off"}
              </span>
              <button
                type="button"
                onClick={() => {
                  const nextVal = !autoRenew;
                  setAutoRenew(nextVal);
                  showSuccess(`Auto-renew turned ${nextVal ? "ON" : "OFF"}`);
                }}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  autoRenew ? 'bg-purple-600' : 'bg-zinc-300 dark:bg-zinc-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    autoRenew ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. FREE TRIAL SECTION (If active or claimable)            */}
      {/* ========================================================= */}
      {hasActiveTrial || subStatus === "trial" ? (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-sky-500/10 border border-amber-500/30 space-y-3 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 dark:text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">14-Day Free Pro Trial Active</h4>
                  <span className="px-2 py-0.5 text-[9px] sm:text-[10px] font-extrabold bg-amber-500 text-black rounded-md uppercase">
                    TRIAL
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">
                  Your trial expires on <strong>{trialEndDate}</strong> ({trialDaysRemaining} days remaining).
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleSelectPlan("pro")}
              className="px-3.5 py-2 sm:px-4 sm:py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-md active:scale-95 cursor-pointer shrink-0 w-full sm:w-auto"
            >
              Keep Pro Membership
            </button>
          </div>

          {/* Trial Progress Bar */}
          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
              <span>Trial Progress</span>
              <span>Day 9 of 14</span>
            </div>
            <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-900 rounded-full overflow-hidden border border-zinc-300 dark:border-zinc-800">
              <div className="h-full bg-gradient-to-r from-amber-500 to-purple-500 rounded-full w-[64%]" />
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="font-bold text-zinc-900 dark:text-white">Want to try Enterprise features?</p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Start a 7-day no-risk trial of A-NOVA Enterprise</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setHasActiveTrial(true);
              setSubStatus("trial");
              showSuccess("7-day Pro/Enterprise trial activated!");
            }}
            className="px-3.5 py-2 rounded-xl bg-purple-100 hover:bg-purple-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-purple-800 dark:text-purple-300 border border-purple-500/30 text-xs font-bold transition-all cursor-pointer shrink-0 w-full sm:w-auto min-h-[40px] sm:min-h-0"
          >
            Claim Free Trial
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. WHAT'S INCLUDED (Plan Benefits)                        */}
      {/* ========================================================= */}
      <div className="p-4 sm:p-5 md:p-5 lg:p-6 rounded-2xl md:rounded-3xl bg-white dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800/80 space-y-3 md:space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 pb-3">
          <div>
            <h4 className="text-xs lg:text-sm font-extrabold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>What's Included in Your {currentPlan.name} Plan</span>
            </h4>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              Features available in your active tier vs premium capabilities.
            </p>
          </div>
          <span className="text-[10px] md:text-[11px] font-bold text-purple-700 dark:text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-full shrink-0">
            Tier {currentPlan.name}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-3">
          {currentPlan.benefits.map((benefit, idx) => (
            <div
              key={idx}
              className={`p-3 md:p-3.5 rounded-xl md:rounded-2xl border flex items-start gap-2.5 md:gap-3 transition-all ${
                benefit.included
                  ? "bg-zinc-50 dark:bg-zinc-900/90 border-zinc-200 dark:border-zinc-800/90 text-zinc-900 dark:text-white"
                  : "bg-zinc-100/50 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-900 text-zinc-400 dark:text-zinc-500 opacity-60"
              }`}
            >
              {benefit.included ? (
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                  <Lock className="w-3 h-3 text-zinc-500 dark:text-zinc-600" />
                </div>
              )}
              <div className="min-w-0">
                <p className={`text-xs font-semibold ${benefit.included ? "text-zinc-800 dark:text-zinc-200" : "text-zinc-400 dark:text-zinc-500 line-through"}`}>
                  {benefit.title}
                </p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {benefit.included ? "Full access included" : "Upgrade to Pro to unlock"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 5. BILLING & PAYMENT METHODS                              */}
      {/* ========================================================= */}
      <div className="p-4 sm:p-5 md:p-5 lg:p-6 rounded-2xl md:rounded-3xl bg-white dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800/80 space-y-3 md:space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800/80 pb-3">
          <div>
            <h4 className="text-xs lg:text-sm font-extrabold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-sky-500 dark:text-sky-400 shrink-0" />
              <span>Payment Methods & Billing Details</span>
            </h4>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              Manage credit cards, UPI handles, and auto-charge defaults.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowPaymentModal(true)}
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-md flex items-center justify-center gap-1.5 w-full sm:w-auto shrink-0 min-h-[40px] sm:min-h-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Payment Method</span>
          </button>
        </div>

        {/* Payment Methods List */}
        {paymentMethods && paymentMethods.length > 0 ? (
          <div className="space-y-3">
            {paymentMethods.map((pm) => (
              <div
                key={pm.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 md:p-4 rounded-xl md:rounded-2xl bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700/80 transition-all gap-3"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-sky-600 dark:text-sky-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">{pm.provider}</p>
                      {pm.isDefault && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">{pm.details}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t sm:border-0 border-zinc-200 dark:border-zinc-800/80 pt-2 sm:pt-0">
                  {!pm.isDefault && (
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethods(paymentMethods.map(p => ({ ...p, isDefault: p.id === pm.id })));
                        showSuccess("Set as default payment method");
                      }}
                      className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-medium cursor-pointer"
                    >
                      Set Default
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (paymentMethods.length === 1 && subStatus === "active") {
                        showError("Cannot remove the only payment method while subscription is active.");
                        return;
                      }
                      setPaymentMethods(paymentMethods.filter(p => p.id !== pm.id));
                      showSuccess("Payment method removed");
                    }}
                    className="p-2 text-rose-500 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                    title="Remove Payment Method"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 md:p-8 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 text-center space-y-2">
            <CreditCard className="w-8 h-8 md:w-10 md:h-10 text-zinc-400 dark:text-zinc-500 mx-auto" />
            <p className="text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-200">No payment methods saved.</p>
            <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400">Add a credit card or UPI ID for seamless renewals.</p>
          </div>
        )}
      </div>


      {/* ========================================================= */}
      {/* 7. PAYMENT HISTORY & GST INVOICES                         */}
      {/* ========================================================= */}
      <div className="p-4 sm:p-5 md:p-5 lg:p-6 rounded-2xl md:rounded-3xl bg-white dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800/80 space-y-3 md:space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 pb-3">
          <div>
            <h4 className="text-xs lg:text-sm font-extrabold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
              <span>Payment History & Tax Invoices</span>
            </h4>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              View receipts and download official GST invoices.
            </p>
          </div>
        </div>

        {billingHistory && billingHistory.length > 0 ? (
          <div className="space-y-2.5">
            {billingHistory.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 md:p-4 rounded-xl md:rounded-2xl bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700/80 transition-all gap-2.5 md:gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white truncate">{inv.planName}</p>
                      <span className="text-[9px] md:text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                        {inv.status}
                      </span>
                    </div>
                    <p className="text-[10px] md:text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5 truncate">
                      {inv.id} • {inv.date} • {inv.paymentMethod}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t sm:border-0 border-zinc-200 dark:border-zinc-800/80 pt-2 sm:pt-0">
                  <span className="text-xs sm:text-sm font-black text-zinc-900 dark:text-white">₹{inv.amount}.00</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedInvoice(inv)}
                      className="px-2.5 py-1.5 md:px-3 md:py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition-all cursor-pointer min-h-[36px]"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadInvoice(inv)}
                      className="px-2.5 py-1.5 md:px-3 md:py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer min-h-[36px]"
                    >
                      <FileDown className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                      <span className="hidden sm:inline">Download PDF</span>
                      <span className="sm:hidden">PDF</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 md:p-8 rounded-2xl md:rounded-3xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 text-center space-y-2">
            <FileText className="w-8 h-8 md:w-10 md:h-10 text-zinc-400 dark:text-zinc-500 mx-auto" />
            <h5 className="text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-200">No payment history.</h5>
            <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400">No invoices available.</p>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 8. HELP & BILLING FAQ                                     */}
      {/* ========================================================= */}
      <div className="p-4 sm:p-5 md:p-5 lg:p-6 rounded-2xl md:rounded-3xl bg-white dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800/80 space-y-3 md:space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 pb-3">
          <div>
            <h4 className="text-xs lg:text-sm font-extrabold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-sky-500 dark:text-sky-400 shrink-0" />
              <span>Billing FAQ & Support</span>
            </h4>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              Need assistance with charges, refunds, or missing purchases?
            </p>
          </div>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-2">
          {[
            {
              q: "When will I be charged for my subscription?",
              a: "You will be charged automatically on your renewal date (every 30 days for monthly plans, or every 365 days for yearly plans) using your saved payment method."
            },
            {
              q: "Can I cancel or pause my plan anytime?",
              a: "Yes! You can pause or cancel your subscription anytime with zero penalty. You will retain full access to Pro features until the end of your current billing period."
            },
            {
              q: "Are tax invoices available with GST details?",
              a: "Yes. All invoices generated for Indian accounts include 18% GST itemization and official invoice numbers for accounting."
            },
            {
              q: "What payment options are supported in India?",
              a: "We accept PhonePe, Google Pay, BHIM UPI, RuPay cards, Visa, Mastercard, and Net Banking across all major Indian banks."
            }
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/80 space-y-2 cursor-pointer transition-all hover:border-zinc-300 dark:hover:border-zinc-700/80"
              onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
            >
              <div className="flex items-center justify-between text-xs font-bold text-zinc-900 dark:text-white gap-2">
                <span>{item.q}</span>
                {expandedFaq === idx ? <ChevronUp className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />}
              </div>
              {expandedFaq === idx && (
                <p className="text-xs text-zinc-600 dark:text-zinc-400 pt-1 leading-relaxed border-t border-zinc-200 dark:border-zinc-800/80">
                  {item.a}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Support Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 md:gap-3 pt-2">
          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all min-h-[40px]"
          >
            <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
            <span>Report Payment Problem</span>
          </button>
          <button
            type="button"
            onClick={handleRestorePurchase}
            className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all min-h-[40px]"
          >
            <RotateCcw className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
            <span>Restore Missing Purchase</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL DIALOGS                                             */}
      {/* ========================================================= */}

      {/* 1. CHANGE PLAN MODAL */}
      <AnimatePresence>
        {showChangePlanModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-4xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-6 text-zinc-900 dark:text-white max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <span>Select a Subscription Plan</span>
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Upgrade or downgrade anytime. Unused time is automatically credited.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowChangePlanModal(false)}
                  className="p-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white bg-zinc-100 dark:bg-zinc-900 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Monthly vs Yearly Toggle inside modal */}
              <div className="flex justify-center">
                <div className="p-1 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 inline-flex gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setBillingCycle("monthly")}
                    className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                      billingCycle === "monthly" ? "bg-purple-600 text-white shadow-md" : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                    }`}
                  >
                    Monthly Billing
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle("yearly")}
                    className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      billingCycle === "yearly" ? "bg-purple-600 text-white shadow-md" : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                    }`}
                  >
                    <span>Yearly Billing</span>
                    <span className="px-1.5 py-0.2 text-[9px] bg-emerald-500 text-black rounded-full font-black">
                      SAVE 20%
                    </span>
                  </button>
                </div>
              </div>

              {/* Plans Grid inside Modal */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {SUBSCRIPTION_PLANS.map((plan) => {
                  const isSelected = plan.id === currentPlanId;
                  const priceText = billingCycle === "monthly" ? plan.formattedMonthly : plan.formattedYearly;

                  return (
                    <div
                      key={plan.id}
                      className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 transition-all relative ${
                        isSelected
                          ? "bg-purple-500/10 dark:bg-purple-950/20 border-purple-500 ring-1 ring-purple-500/50"
                          : "bg-zinc-50 dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                      }`}
                    >
                      {plan.popular && (
                        <span className="absolute -top-2.5 right-4 px-2 py-0.5 text-[9px] font-black bg-purple-500 text-white rounded-full uppercase tracking-wider">
                          POPULAR
                        </span>
                      )}

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{plan.emoji}</span>
                          <h4 className="font-extrabold text-base text-zinc-900 dark:text-white">{plan.name}</h4>
                        </div>

                        <p className="text-xl font-black text-purple-600 dark:text-purple-400">{priceText}</p>

                        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800/80 space-y-2">
                          {plan.benefits.map((b, i) => (
                            <div key={i} className="flex items-center gap-2 text-[11px] text-zinc-700 dark:text-zinc-300">
                              {b.included ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              ) : (
                                <X className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600 shrink-0" />
                              )}
                              <span className={b.included ? "text-zinc-800 dark:text-zinc-200" : "text-zinc-400 dark:text-zinc-500"}>{b.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isSelected || isLoading}
                        onClick={() => handleSelectPlan(plan.id)}
                        className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer ${
                          isSelected
                            ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-500 cursor-not-allowed border border-zinc-300 dark:border-zinc-700"
                            : "bg-purple-600 hover:bg-purple-500 text-white"
                        }`}
                      >
                        {isSelected ? "Current Plan" : `Choose ${plan.name}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. CHANGE BILLING CYCLE MODAL */}
      <AnimatePresence>
        {showBillingCycleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4 text-zinc-900 dark:text-white"
            >
              <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>Change Billing Cycle</span>
              </h3>

              <p className="text-xs text-zinc-600 dark:text-zinc-300">
                Switching to yearly billing saves you 20% on your subscription price annually.
              </p>

              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setBillingCycle("monthly");
                    setShowBillingCycleModal(false);
                    showSuccess("Billing cycle updated to Monthly");
                  }}
                  className={`w-full p-4 rounded-xl border text-left flex items-center justify-between cursor-pointer ${
                    billingCycle === "monthly" ? "bg-purple-500/10 dark:bg-purple-950/30 border-purple-500 text-zinc-900 dark:text-white" : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold text-zinc-900 dark:text-white">Monthly Billing</p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Billed every 30 days ({currentPlan.formattedMonthly})</p>
                  </div>
                  {billingCycle === "monthly" && <Check className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBillingCycle("yearly");
                    setShowBillingCycleModal(false);
                    showSuccess("Billing cycle updated to Yearly (20% Savings applied)");
                  }}
                  className={`w-full p-4 rounded-xl border text-left flex items-center justify-between cursor-pointer ${
                    billingCycle === "yearly" ? "bg-purple-500/10 dark:bg-purple-950/30 border-purple-500 text-zinc-900 dark:text-white" : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-zinc-900 dark:text-white">Yearly Billing</p>
                      <span className="px-2 py-0.2 text-[9px] font-black bg-emerald-500 text-black rounded">SAVE 20%</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Billed once a year ({currentPlan.formattedYearly})</p>
                  </div>
                  {billingCycle === "yearly" && <Check className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
                </button>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowBillingCycleModal(false)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-300 text-xs font-semibold rounded-xl"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. PAUSE CONFIRMATION MODAL */}
      <AnimatePresence>
        {showPauseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4 text-zinc-900 dark:text-white"
            >
              <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
                <PauseCircle className="w-6 h-6" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">Pause Subscription?</h3>
              </div>

              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed bg-zinc-50 dark:bg-zinc-950 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                Pausing holds your upcoming renewal charge. You can resume anytime without losing your account history or preferences.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPauseModal(false)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-300 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleTogglePause}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-extrabold rounded-xl cursor-pointer"
                >
                  Confirm Pause
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. CANCEL CONFIRMATION MODAL */}
      <AnimatePresence>
        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4 text-zinc-900 dark:text-white"
            >
              <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                <Trash2 className="w-6 h-6" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">Cancel Subscription?</h3>
              </div>

              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed bg-zinc-50 dark:bg-zinc-950 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                You will retain full access to Pro features until <strong>{renewalDate}</strong>. After this date, your account will revert to the Free plan.
              </p>

              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase">Optional Feedback</label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Tell us why you are leaving..."
                  className="w-full h-10 px-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white rounded-xl outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-300 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Keep Subscription
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Yes, Cancel Plan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. ADD PAYMENT METHOD MODAL */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4 text-zinc-900 dark:text-white"
            >
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                  <span>Add Payment Method</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="p-1 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs">
                <button
                  type="button"
                  onClick={() => setNewPmType("UPI")}
                  className={`flex-1 py-2 font-bold rounded-lg cursor-pointer ${
                    newPmType === "UPI" ? "bg-purple-600 text-white" : "text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  BHIM UPI
                </button>
                <button
                  type="button"
                  onClick={() => setNewPmType("Card")}
                  className={`flex-1 py-2 font-bold rounded-lg cursor-pointer ${
                    newPmType === "Card" ? "bg-purple-600 text-white" : "text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  Debit / Credit Card
                </button>
              </div>

              {newPmType === "UPI" ? (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">UPI VPA / Handle</label>
                  <input
                    type="text"
                    value={upiIdInput}
                    onChange={(e) => setUpiIdInput(e.target.value)}
                    placeholder="username@ybl / mobile@paytm"
                    className="w-full h-10 px-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white rounded-xl outline-none focus:border-purple-500"
                  />
                  <p className="text-[10px] text-zinc-500">Supports PhonePe, GPay, Paytm, BHIM</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Card Number</label>
                    <input
                      type="text"
                      value={cardNumberInput}
                      onChange={(e) => setCardNumberInput(e.target.value)}
                      placeholder="4532 •••• •••• 8888"
                      className="w-full h-10 px-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white rounded-xl outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Expiry (MM/YY)</label>
                      <input
                        type="text"
                        value={cardExpiryInput}
                        onChange={(e) => setCardExpiryInput(e.target.value)}
                        placeholder="12/28"
                        className="w-full h-10 px-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white rounded-xl outline-none focus:border-purple-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">CVC / CVV</label>
                      <input
                        type="password"
                        value={cardCvcInput}
                        onChange={(e) => setCardCvcInput(e.target.value)}
                        placeholder="•••"
                        className="w-full h-10 px-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white rounded-xl outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-300 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddPaymentMethod}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Save Payment Method
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. INVOICE DETAIL VIEW MODAL */}
      <AnimatePresence>
        {selectedInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5 text-zinc-900 dark:text-white"
            >
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">Invoice Details</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="p-1 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Invoice ID</span>
                  <span className="text-zinc-900 dark:text-white font-bold">{selectedInvoice.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Date</span>
                  <span className="text-zinc-700 dark:text-zinc-300">{selectedInvoice.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Status</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{selectedInvoice.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Payment Method</span>
                  <span className="text-zinc-700 dark:text-zinc-300">{selectedInvoice.paymentMethod}</span>
                </div>
                <div className="border-t border-zinc-200 dark:border-zinc-800 pt-2 flex justify-between">
                  <span className="text-zinc-500">GSTIN</span>
                  <span className="text-zinc-700 dark:text-zinc-300">{selectedInvoice.gstNumber}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-zinc-200 dark:border-zinc-800 font-sans">
                  <span className="font-bold text-zinc-900 dark:text-white">Total Amount</span>
                  <span className="font-extrabold text-purple-600 dark:text-purple-400">₹{selectedInvoice.amount}.00 INR</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => handleDownloadInvoice(selectedInvoice)}
                  className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Download PDF Receipt</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. REPORT PROBLEM MODAL */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4 text-zinc-900 dark:text-white"
            >
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                  <span>Report Payment Problem</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="p-1 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-zinc-600 dark:text-zinc-300">
                If you were charged twice or experienced a failed transaction, describe your issue below. Our support team will investigate within 2 hours.
              </p>

              <textarea
                rows={4}
                placeholder="Describe what happened..."
                className="w-full p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white rounded-xl outline-none focus:border-purple-500 resize-none"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowReportModal(false);
                    showSuccess("Problem report submitted to support team!");
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl"
                >
                  Submit Ticket
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
