import type { Request, Response } from "express";
import { sendMessage } from "../twilioSetup/sendMessage";
import User from "../database/databaseModel/user";
import riderRequest from "../database/databaseModel/riderRequest";
import Rider from "../database/databaseModel/rider";
import Subscription from "../database/databaseModel/subscription";
import {
  menuMessage,
  helpMessage,
  licensePromptMessage,
  namePromptMessage,
  firstNamePromptMessage,
  licensePlatePromptMessage,
  riderRegisterationAlert,
  locationPromptMessage,
  rideNotification,
  userRideNotification,
  riderRideNotification,
  locationMessage,
  destinationMessage,
  destinationPromptMessage,
} from "../utilities/menuMessage";
import {
  generateUniqueACCode,
  formatDate,
  generateAcceptCode,
} from "../utilities/helperFunctions";
import dotenv from "dotenv";
import RideOrder from "../database/databaseModel/rideOrder";
import SuccessfulOrder from "../database/databaseModel/successfulOrders";
import axios from "axios";
import NodeCache from "node-cache";

dotenv.config();
const {
  ADMIN_WHATSAPP_NUMBER1,
  ADMIN_WHATSAPP_NUMBER2,
  ADMIN_WHATSAPP_NUMBER3,
} = process.env;

const admin = [
  ADMIN_WHATSAPP_NUMBER1!,
  ADMIN_WHATSAPP_NUMBER2!,
  ADMIN_WHATSAPP_NUMBER3!,
];

const { PAYSTACK_SECRET_KEY } = process.env;


// Initialize cache with 5 minute TTL
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// Paystack API helper functions
const paystackApi = axios.create({
  baseURL: 'https://api.paystack.co',
  headers: {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json',
  },
});

// Helper function to create Paystack customer
const createPaystackCustomer = async (email: string, firstName: string, lastName: string, phone: string): Promise<any> => {
  try {
    const response = await paystackApi.post('/customer', {
      email,
      first_name: firstName,
      last_name: lastName,
      phone
    });
    
    return response.data;
  } catch (error) {
    console.error('Error creating Paystack customer:', error);
    throw error;
  }
};

// Helper function to get subscription management link
const getSubscriptionManagementLink = async (subscriptionCode: string): Promise<string> => {
  try {
    const cacheKey = `sub_manage_${subscriptionCode}`;
    const cachedLink = cache.get(cacheKey);
    
    if (cachedLink) {
      return cachedLink as string;
    }

    const response = await paystackApi.get(`/subscription/${subscriptionCode}/manage/link`);
    
    if (response.data.status && response.data.data.link) {
      cache.set(cacheKey, response.data.data.link, 300); // Cache for 5 minutes
      return response.data.data.link;
    }
    
    throw new Error('Failed to generate management link');
  } catch (error) {
    console.error('Error getting subscription management link:', error);
    throw error;
  }
};

// Helper function to cancel subscription via Paystack API
const cancelPaystackSubscription = async (subscriptionCode: string, token: string): Promise<boolean> => {
  try {
    const response = await paystackApi.post('/subscription/disable', {
      code: subscriptionCode,
      token: token
    });
    
    return response.data.status === true;
  } catch (error) {
    console.error('Error cancelling Paystack subscription:', error);
    return false;
  }
};

// Helper function to fetch user subscriptions from Paystack
const fetchUserSubscriptionsFromPaystack = async (customerId: string): Promise<any[]> => {
  try {
    const cacheKey = `user_subs_${customerId}`;
    const cachedSubs = cache.get(cacheKey);
    
    if (cachedSubs) {
      return cachedSubs as any[];
    }

    const response = await paystackApi.get('/subscription', {
      params: { customer: customerId }
    });
    
    if (response.data.status && response.data.data) {
      cache.set(cacheKey, response.data.data, 300); // Cache for 5 minutes
      return response.data.data;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching subscriptions from Paystack:', error);
    return [];
  }
};

// Helper function to sync user subscription with Paystack
const syncUserSubscriptionWithPaystack = async (userPhone: string, paystackCustomerId: string): Promise<void> => {
  try {
    const paystackSubscriptions = await fetchUserSubscriptionsFromPaystack(paystackCustomerId);
    if (paystackSubscriptions.length === 0) {
      // No active subscriptions on Paystack, ensure free plan
      const existingFreeSub = await Subscription.findOne({
        userId: userPhone,
        plan: 'free',
        status: 'active'
      });
      
      if (!existingFreeSub) {
        await initializeFreeSubscription(userPhone);
      }
      return;
    }
    // Process Paystack subscriptions
    for (const paystackSub of paystackSubscriptions) {
      if (paystackSub.status === 'active') {
        let planType: 'free' | 'basic' | 'premium' = 'free';
        let price = 0;

        // Determine plan based on amount
        if (paystackSub.amount === 100000) { // ₦1,000 in kobo
          planType = 'basic';
          price = 1000;
        } else if (paystackSub.amount === 300000) { // ₦3,000 in kobo
          planType = 'premium';
          price = 3000;
        }

        // Update or create local subscription record
        await Subscription.findOneAndUpdate(
          { 
            userId: userPhone,
            subscriptionCode: paystackSub.subscription_code
          },
          {
            plan: planType,
            status: 'active',
            startDate: new Date(paystackSub.createdAt),
            endDate: new Date(paystackSub.next_payment_date || new Date().setMonth(new Date().getMonth() + 1)),
            price,
            subscriptionCode: paystackSub.subscription_code,
            paystackCustomerId: paystackCustomerId
          },
          { upsert: true, new: true }
        );

        // Cancel any other active subscriptions for this user
        await Subscription.updateMany(
          { 
            userId: userPhone, 
            status: 'active',
            subscriptionCode: { $ne: paystackSub.subscription_code }
          },
          { status: 'cancelled' }
        );
      } else if (paystackSub.status === 'cancelled' || paystackSub.status === 'inactive') {
        // Mark local subscription as cancelled
        await Subscription.findOneAndUpdate(
          { subscriptionCode: paystackSub.subscription_code },
          { status: 'cancelled' }
        );
      }
    }
  } catch (error) {
    console.error('Error syncing subscription with Paystack:', error);
  }
};

// Helper function to initialize free subscription for new users
const initializeFreeSubscription = async (userPhone: string) => {
  try {
    const existingSubscription = await Subscription.findOne({
      userId: userPhone,
      status: 'active'
    });
    if (!existingSubscription) {
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 30); // 30 days free trial
      await Subscription.findOneAndUpdate(
        { userId: userPhone },
        {
          userId: userPhone,
          plan: 'free',
          status: 'active',
          startDate,
          endDate,
          price: 0
        },
        { upsert: true, new: true }
      );
      
      console.log(`Free subscription initialized for user: ${userPhone}`);
    }
  } catch (error) {
    console.error("Error initializing free subscription:", error);
  }
};

// Helper function to check user's ride eligibility
const checkRideEligibility = async (userPhone: string): Promise<{ canRide: boolean; message: string }> => {
  try {
    // First, try to sync with Paystack if user has a paystackId
    const user = await User.findOne({ phone: userPhone });
    if (user && user.paystackId) {
      await syncUserSubscriptionWithPaystack(userPhone, user.paystackId);
    }
    const currentSubscription = await Subscription.findOne({ 
      userId: userPhone, 
      status: 'active',
      endDate: { $gte: new Date() }
    }).sort({ startDate: -1 });

    if (!currentSubscription) {
      // Initialize free subscription if none exists
      await initializeFreeSubscription(userPhone);
      return { canRide: true, message: "" };
    }

    // For free plan, check ride count for current month
    if (currentSubscription.plan === 'free') {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const rideCount = await SuccessfulOrder.countDocuments({
        userPhone,
        createdAt: { $gte: startOfMonth }
      });

      if (rideCount >= 5) {
        return { 
          canRide: false, 
          message: "❌ *FREE PLAN LIMIT REACHED*\n\nYou've used all 5 rides this month. Upgrade to continue riding. 🚗" 
        };
      }
    }

    // For basic plan, check ride count for current month
    if (currentSubscription.plan === 'basic') {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const rideCount = await SuccessfulOrder.countDocuments({
        userPhone,
        createdAt: { $gte: startOfMonth }
      });

      if (rideCount >= 14) {
        return { 
          canRide: false, 
          message: "❌ *BASIC PLAN LIMIT REACHED*\n\nYou've used all 14 rides this month. Upgrade to Premium for unlimited rides. 🚀" 
        };
      }
    }

    // Premium plan has unlimited rides
    return { canRide: true, message: "" };
  } catch (error) {
    console.error("Error checking ride eligibility:", error);
    return { canRide: false, message: "❌ *SUBSCRIPTION ERROR*\n\nUnable to verify subscription status. Please try again later. ⚠️" };
  }
};

// Helper function to get subscription status message (without management link)
const getSubscriptionStatusMessage = async (userPhone: string): Promise<string> => {
  try {
    // Sync with Paystack first if user has paystackId
    const user = await User.findOne({ phone: userPhone });
    if (user && user.paystackId) {
      await syncUserSubscriptionWithPaystack(userPhone, user.paystackId);
    }

    const currentSubscription = await Subscription.findOne({ 
      userId: userPhone, 
      status: 'active',
      endDate: { $gte: new Date() }
    }).sort({ startDate: -1 });

    if (!currentSubscription) {
      // Initialize free subscription if none exists
      await initializeFreeSubscription(userPhone);
      return "📊 *SUBSCRIPTION STATUS*\n\n🆓 Plan: FREE (Default)\n🚗 Available Rides: 5\n📅 New users get 5 free rides monthly!\n\n💎 Upgrade for more rides!";
    }

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const rideCount = await SuccessfulOrder.countDocuments({
      userPhone,
      createdAt: { $gte: startOfMonth }
    });

    let maxRides:any = 0;
    switch (currentSubscription.plan) {
      case 'free':
        maxRides = 5;
        break;
      case 'basic':
        maxRides = 14;
        break;
      case 'premium':
        maxRides = 'Unlimited';
        break;
    }

    const remainingRides = maxRides === 'Unlimited' ? 'Unlimited' : (maxRides as number - rideCount);
    
    let statusMessage = `📊 *SUBSCRIPTION STATUS*\n\n${currentSubscription.plan === 'free' ? '🆓' : currentSubscription.plan === 'basic' ? '💎' : '🚀'} Plan: ${currentSubscription.plan.toUpperCase()}\n🚗 Rides This Month: ${rideCount}\n📈 Remaining Rides: ${remainingRides}\n📅 Valid Until: ${formatDate(currentSubscription.endDate)}`;
    
    // Only show management option hint for paid subscriptions
    if (currentSubscription.plan !== 'free') {
      statusMessage += `\n\n⚙️ To manage your subscription, select *44* from the menu`;
    }

    return statusMessage;
  } catch (error) {
    console.error("Error getting subscription status:", error);
    return "❌ *SUBSCRIPTION STATUS*\n\nUnable to retrieve status. Please try again later. ⚠️";
  }
};

// Helper function to get subscription management link (only when requested)
const getSubscriptionManagementMessage = async (userPhone: string): Promise<string> => {
  try {
    const currentSubscription = await Subscription.findOne({
      userId: userPhone,
      status: 'active'
    });

    if (!currentSubscription) {
      return "❌ *NO ACTIVE SUBSCRIPTION*\n\nNo active subscription to manage. 📭";
    }

    if (currentSubscription.plan === 'free') {
      return "ℹ️ *CANNOT MANAGE FREE PLAN*\n\nFree plan is your default subscription. Upgrade for more features. 💎";
    }

    // For paid subscriptions, provide management link
    if (currentSubscription.subscriptionCode) {
      try {
        const manageLink = await getSubscriptionManagementLink(currentSubscription.subscriptionCode);
        return `⚙️ *MANAGE SUBSCRIPTION*\n\nTo cancel or modify your ${currentSubscription.plan.toUpperCase()} plan:\n\n🔗 ${manageLink}\n\nAfter cancellation, you'll switch back to FREE plan. 🔄`;
      } catch (error) {
        return `❌ *MANAGEMENT LINK UNAVAILABLE*\n\nPlease try again later or contact support. 📞`;
      }
    }

    return "📞 *SUBSCRIPTION MANAGEMENT*\n\nPlease contact support to manage your subscription.";
  } catch (error) {
    console.error("Error getting subscription management:", error);
    return "❌ *ERROR*\n\nFailed to get management link. Please try again later. ⚠️";
  }
};

// Helper function to cancel subscription
const cancelSubscription = async (userPhone: string): Promise<string> => {
  try {
    const currentSubscription = await Subscription.findOne({
      userId: userPhone,
      status: 'active'
    });

    if (!currentSubscription) {
      return "❌ *NO ACTIVE SUBSCRIPTION*\n\nNo active subscription to cancel. 📭";
    }

    if (currentSubscription.plan === 'free') {
      return "ℹ️ *CANNOT CANCEL FREE PLAN*\n\nFree plan is your default subscription. Upgrade for more features. 💎";
    }

    // For paid subscriptions, provide management link
    if (currentSubscription.subscriptionCode) {
      try {
        const manageLink = await getSubscriptionManagementLink(currentSubscription.subscriptionCode);
        return `⚙️ *MANAGE SUBSCRIPTION*\n\nTo cancel or modify your ${currentSubscription.plan.toUpperCase()} plan:\n\n🔗 ${manageLink}\n\nAfter cancellation, you'll switch back to FREE plan. 🔄`;
      } catch (error) {
        return `❌ *MANAGEMENT LINK UNAVAILABLE*\n\nPlease try again later or contact support. 📞`;
      }
    }

    return "📞 *SUBSCRIPTION MANAGEMENT*\n\nPlease contact support to manage your subscription.";
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    return "❌ *ERROR*\n\nFailed to process cancellation. Please try again later. ⚠️";
  }
};

// Helper function to upgrade subscription
const upgradeSubscription = async (userPhone: string, newPlan: 'basic' | 'premium'): Promise<string> => {
  try {
    const currentSubscription = await Subscription.findOne({
      userId: userPhone,
      status: 'active'
    });
    
    if (currentSubscription && currentSubscription.plan === newPlan) {
      return `ℹ️ *ALREADY ON ${newPlan.toUpperCase()} PLAN*\n\nYou're already subscribed to ${newPlan.toUpperCase()} plan. ✅`;
    }

    let paymentLink = '';
    let planName = '';
    let price = 0;
    let rides = '';

    if (newPlan === 'basic') {
      paymentLink = 'https://paystack.shop/pay/vroom';
      planName = 'BASIC';
      price = 1000;
      rides = '14 rides/month';
    } else if (newPlan === 'premium') {
      paymentLink = 'https://paystack.shop/pay/vroom-premium';
      planName = 'PREMIUM';
      price = 3000;
      rides = 'Unlimited rides';
    }

    let warningMessage = '';
    if (currentSubscription && currentSubscription.plan !== 'free') {
      warningMessage = `\n\n⚠️ *Important:* This will cancel your current ${currentSubscription.plan.toUpperCase()} plan and upgrade to ${planName}. This action is not reversible.`;
    }

    return `💎 *UPGRADE TO ${planName} PLAN*\n\n📊 ${rides}\n💰 ₦${price}/month\n\n🔗 Payment Link:\n${paymentLink}${warningMessage}\n\n✅ After payment, subscription will upgrade automatically.\n\n📱 Reply with *49* to check status.`;
  } catch (error) {
    console.error("Error processing upgrade:", error);
    return "❌ *ERROR*\n\nFailed to process upgrade. Please try again later. ⚠️";
  }
};

// Helper function to immediately cancel subscription
const immediateCancelSubscription = async (userPhone: string): Promise<string> => {
  try {
    const currentSubscription = await Subscription.findOne({
      userId: userPhone,
      status: 'active'
    });

    if (!currentSubscription) {
      return "❌ *NO ACTIVE SUBSCRIPTION*\n\nNo active subscription found. 📭";
    }

    if (currentSubscription.plan === 'free') {
      return "ℹ️ *CANNOT CANCEL FREE PLAN*\n\nFree plan is your default subscription. 💎";
    }

    if (!currentSubscription.subscriptionCode) {
      return "❌ *UNABLE TO CANCEL*\n\nSubscription code not found. Contact support. 📞";
    }

    // For immediate cancellation, we need the token from the management link
    try {
      const manageLink = await getSubscriptionManagementLink(currentSubscription.subscriptionCode);
      // Extract token from the management link
      const tokenMatch = manageLink.match(/subscription_token=([^&]+)/);
      
      if (tokenMatch && tokenMatch[1]) {
        const success = await cancelPaystackSubscription(currentSubscription.subscriptionCode, tokenMatch[1]);
        
        if (success) {
          // Update local database
          await Subscription.findOneAndUpdate(
            { subscriptionCode: currentSubscription.subscriptionCode },
            { status: 'cancelled' }
          );
          
          // Initialize free subscription
          await initializeFreeSubscription(userPhone);
          
          return "✅ *SUBSCRIPTION CANCELLED*\n\nYour subscription has been cancelled successfully. Switched back to FREE plan. 🔄";
        }
      }
      
      return "❌ *CANCELLATION FAILED*\n\nPlease use the management link or contact support. 📞";
      
    } catch (error) {
      console.error('Error in immediate cancellation:', error);
      return "❌ *CANCELLATION ERROR*\n\nPlease try again later or contact support. 📞";
    }
  } catch (error) {
    console.error("Error in immediate cancellation:", error);
    return "❌ *ERROR*\n\nFailed to cancel subscription. Please try again later. ⚠️";
  }
};

export const userRequest = async (req: Request, res: Response) => {
  try {
    const whatsappMessage = req.body.Body?.trim().toLowerCase();
    const recipientPhone = (req.body.From as string).replace("whatsapp:", "");
    let userDetails = await User.findOne({ phone: recipientPhone });
    if (!userDetails) {
      const addUser = await User.create({
        phone: recipientPhone,
        state: "menu",
        status: "customer",
        processingState: "1",
      });
      if (!addUser) {
        res.status(500).send("Failed to add new user");
      }
      // Initialize free subscription for new user
      await initializeFreeSubscription(recipientPhone); 
      // Create Paystack customer for new user
      try {
        const email = `${recipientPhone}@vroom.ng`; // Generate email from phone
        const customerData = await createPaystackCustomer(
          email,
          'User',  
          recipientPhone,  
          recipientPhone
        );
        console.log('Paystack customer creation response:', customerData);
        if (customerData.status && customerData.data) {
          await User.findOneAndUpdate(
            { phone: recipientPhone },
            { paystackId: customerData.data.id }
          );
          console.log(`Paystack customer created for user: ${recipientPhone}`);
        }
      } catch (error) {
        console.error('Failed to create Paystack customer:', error);
        // Continue without Paystack customer creation
      }
    }

    if (whatsappMessage === "1" && userDetails) {
      if (
        userDetails!.state === "menu" &&
        userDetails!.processingState === "3"
      ) {
        await sendMessage(
          recipientPhone,
          `📩 *REGISTRATION IN PROGRESS*\n\nYou'll receive notification once approved. ✅`
        );
        res.status(200).send("Request successful!");
      } else if (
        userDetails!.state === "menu" &&
        userDetails!.status === "rider" &&
        userDetails!.processingState === "4"
      ) {
        await sendMessage(
          recipientPhone,
          `🎉 *CONGRATULATIONS!*\n\nYou're now a VROOM Rider 🏍️\n\n🚦 SAFETY FIRST ALWAYS!`
        );
        res.status(200).send("Request successful!");
      } else {
        userDetails!.state = "registeringAsARider";
        userDetails!.processingState = "1";
        const saveDetails = await userDetails!.save();
        if (!saveDetails) {
          res.status(500).send("Failed to save user details");
        }
        await sendMessage(recipientPhone, firstNamePromptMessage);

        const addRiderRequest = await riderRequest.create({
          phone: recipientPhone,
        });
        if (!addRiderRequest) {
          res.status(500).send("Failed to add new user");
        }

        // Create Paystack customer for rider
        try {
          const email = `${recipientPhone}@vrom.com`;
          const customerData = await createPaystackCustomer(
            email,
            'Rider',
            recipientPhone,
            recipientPhone
          );
          
          if (customerData.status && customerData.data) {
            await User.findOneAndUpdate(
              { phone: recipientPhone },
              { paystackId: customerData.data.id }
            );
            console.log(`Paystack customer created for rider: ${recipientPhone}`);
          }
        } catch (error) {
          console.error('Failed to create Paystack customer for rider:', error);
        }

        res.status(200).send("Request successful!");
      }
    } else if (whatsappMessage === "2" && userDetails) {
      // Check subscription before allowing ride request
      const eligibility = await checkRideEligibility(recipientPhone);
      if (!eligibility.canRide) {
        await sendMessage(recipientPhone, eligibility.message);
        res.status(200).send("Request successful!");
        return;
      }

      const order = await RideOrder.create({
        userPhone: recipientPhone,
      });
      if (!order) {
        res.status(500).send("Failed to add ride order");
      }
      await sendMessage(recipientPhone, locationMessage);

      userDetails!.state = "RequestingARide";
      userDetails!.rideRequest = "1";
      const saveDetails = await userDetails!.save();
      if (!saveDetails) {
        res.status(500).send("Failed to save user details");
      }

      res.status(200).send("Request successful!");
    } else if (whatsappMessage === "4" && userDetails) {
      await sendMessage(recipientPhone, helpMessage);
    } else if (whatsappMessage === "3" && userDetails) {
      // Subscription menu
      const subscriptionStatus = await getSubscriptionStatusMessage(recipientPhone);
      const subscriptionMenu = `${subscriptionStatus}\n\n💎 *SUBSCRIPTION PLANS*\n\n🆓 FREE PLAN (Default)\n• 5 rides/month\n• ₦0/month\n\n💎 BASIC PLAN\n• 14 rides/month\n• ₦1,000/month\n\n🚀 PREMIUM PLAN\n• Unlimited rides\n• ₦3,000/month\n\n📱 *Reply with:*\n• *41* - Free Plan Info\n• *42* - Upgrade to Basic\n• *43* - Upgrade to Premium\n• *44* - Manage Subscription\n• *45* - Cancel Subscription\n• *49* - Check Status\n• *0* - Back to Main Menu`;

      await sendMessage(recipientPhone, subscriptionMenu);
      userDetails!.state = "subscriptionMenu";
      const saveDetails = await userDetails!.save();
      if (!saveDetails) {
        res.status(500).send("Failed to save user details");
      }
      res.status(200).send("Request successful!");
    } else if (whatsappMessage === "0" && userDetails) {
      userDetails!.state = "menu";
      userDetails!.processingState = "1";
      const saveDetails = await userDetails!.save();
      if (!saveDetails) {
        res.status(500).send("Failed to save user details");
      }
      await sendMessage(recipientPhone, menuMessage);

      await riderRequest.findOneAndDelete({ phone: recipientPhone });
      res.status(200).send("Request successful!");
    } else if (whatsappMessage === "9" && userDetails) {
      userDetails!.state = "menu";
      userDetails!.rideRequest = "";
      const saveDetails = await userDetails!.save();
      if (!saveDetails) {
        res.status(500).send("Failed to save user details");
      }
      await sendMessage(recipientPhone, menuMessage);

      await RideOrder.findOneAndDelete({ userPhone: recipientPhone });
      res.status(200).send("Request successful!");
    } else if (whatsappMessage === "7" && userDetails) {
      userDetails!.state = "menu";
      userDetails!.rideRequest = "";

      const saveDetails = await userDetails!.save();
      if (!saveDetails) {
        res.status(500).send("Failed to save user details");
      }
      await sendMessage(recipientPhone, menuMessage);

      await SuccessfulOrder.findOneAndDelete({ userPhone: recipientPhone });
      res.status(200).send("Request successful!");
    } else if (whatsappMessage === "319" && userDetails) {
      await sendMessage(
        recipientPhone,
        "*Your RIDER PROFILE has been deleted. You are no longer a VROOM rider.*"
      );

      await Rider.findOneAndDelete({ phone: recipientPhone });
      res.status(200).send("Request successful!");
    } else if (`${whatsappMessage.split("")[0]}` === "r" && userDetails && userDetails!.state === "menu") {
      if (
        recipientPhone === ADMIN_WHATSAPP_NUMBER1! ||
        recipientPhone === ADMIN_WHATSAPP_NUMBER2! ||
        recipientPhone === ADMIN_WHATSAPP_NUMBER3!
      ) {
        let riderDetails = await riderRequest.findOne({
          code: whatsappMessage,
        });
        if (!riderDetails) {
          await sendMessage(recipientPhone, `❌ *Incorrect code or user already approved*`);
          res.status(500).send("Failed to find rider details");
        }

        if (riderDetails!.code.toLowerCase() === whatsappMessage) {
          await sendMessage(
            recipientPhone,
            `✅ *RIDER APPROVED* \n\n${riderDetails!.name}\n${riderDetails!.licenseNo.toUpperCase()}\n${riderDetails!.phone}`
          );

          await sendMessage(
            riderDetails!.phone,
            `🎉 *CONGRATULATIONS!*\n\nYou're now a VROOM Rider 🏍️\n\n🚦 SAFETY FIRST ALWAYS!`
          );

          await User.findOneAndUpdate(
            { phone: riderDetails!.phone },
            { status: "rider", processingState: "4" }
          );

          const addRider = await Rider.create({
            name: riderDetails!.name,
            phone: riderDetails!.phone,
            licenseNo: riderDetails!.licenseNo,
          });
          if (!addRider) {
            res.status(500).send("Failed to add new rider");
          }

          // Create Paystack customer for approved rider
          try {
            const email = `${riderDetails!.phone}@vrom.com`;
            const customerData = await createPaystackCustomer(
              email,
              riderDetails!.name.split(' ')[0] || 'Rider',
              riderDetails!.name.split(' ').slice(1).join(' ') || riderDetails!.phone,
              riderDetails!.phone
            );
            
            if (customerData.status && customerData.data) {
              await User.findOneAndUpdate(
                { phone: riderDetails!.phone },
                { paystackId: customerData.data.id }
              );
              console.log(`Paystack customer created for approved rider: ${riderDetails!.phone}`);
            }
          } catch (error) {
            console.error('Failed to create Paystack customer for approved rider:', error);
          }

          await riderRequest.findOneAndDelete({ phone: riderDetails!.phone });
          res.status(200).send("Request successful!");
        } else {
          await sendMessage(recipientPhone, `❌ *Incorrect code*`);
          res.status(400).send("Wrong code");
        }
      } else {
        await sendMessage(
          recipientPhone,
          `*SORRY! You are not authorized to make this request*.`
        );
        res.status(401).send("Request successful!");
      }
    } else if (`${whatsappMessage.split("")[0]}` === "a" && userDetails && userDetails!.state === "menu" ) {
      const acceptCode = whatsappMessage;
      let riderDetails = await Rider.findOne({
        phone: recipientPhone,
      });

      if (!riderDetails) {
        await sendMessage(
          riderDetails!.phone,
          `❌ *NOT AUTHORIZED*\n\nYou're not authorized for this request. 🚫`
        );
        res.status(500).send("Failed to find rider details");
      }

      let rideDets = await RideOrder.findOne({ acceptCode });
      if (!rideDets) {
        await sendMessage(
          riderDetails!.phone,
          `❌ *Incorrect code or ride already accepted*`
        );
        res.status(500).send("Failed to find ride order details");
      }

      if (acceptCode === rideDets!.acceptCode) {
        sendMessage(
          recipientPhone,
          riderRideNotification(
            rideDets!.location,
            rideDets!.destination,
            rideDets!.userPhone
          )
        );

        sendMessage(
          rideDets!.userPhone,
          userRideNotification(riderDetails!.name, riderDetails!.phone, riderDetails!.licenseNo)
        );

        const addOrder = await SuccessfulOrder.create({
          userPhone: rideDets!.userPhone,
          location: rideDets!.location,
          destination: rideDets!.destination,
          riderPhone: riderDetails!.phone,
        });
        if (!addOrder) {
          res.status(500).send("Failed to add successful order");
        }

        await User.findOneAndUpdate(
          { phone: rideDets!.userPhone },
          { rideRequest: "4" }
        );

        await RideOrder.findOneAndDelete({ acceptCode });
        res.status(200).send("Request successful!");
      } else {
        await sendMessage(riderDetails!.phone, `❌ *Invalid code*`);
        res.status(500).send("Failed to find rider details");
      }
    } else if (whatsappMessage === "41" && userDetails && userDetails.state === "subscriptionMenu") {
      // Free Plan info
      await sendMessage(
        recipientPhone,
        "🆓 *FREE PLAN*\n\n📊 5 rides/month\n💰 ₦0/month\n✨ Perfect for occasional riders\n\nAll new users start with Free plan automatically. 💎 Upgrade for more rides!"
      );
      res.status(200).send("Request successful!");

    } else if (whatsappMessage === "42" && userDetails && userDetails.state === "subscriptionMenu") {
      // Upgrade to Basic Plan
      const upgradeMessage = await upgradeSubscription(recipientPhone, 'basic');
      await sendMessage(recipientPhone, upgradeMessage);
      res.status(200).send("Request successful!");

    } else if (whatsappMessage === "43" && userDetails && userDetails.state === "subscriptionMenu") {
      // Upgrade to Premium Plan
      const upgradeMessage = await upgradeSubscription(recipientPhone, 'premium');
      await sendMessage(recipientPhone, upgradeMessage);
      res.status(200).send("Request successful!");

    } else if (whatsappMessage === "44" && userDetails && userDetails.state === "subscriptionMenu") {
      // Manage subscription (show management link)
      const managementMessage = await getSubscriptionManagementMessage(recipientPhone);
      await sendMessage(recipientPhone, managementMessage);
      res.status(200).send("Request successful!");

    } else if (whatsappMessage === "45" && userDetails && userDetails.state === "subscriptionMenu") {
      // Immediate cancellation
      const cancelMessage = await immediateCancelSubscription(recipientPhone);
      await sendMessage(recipientPhone, cancelMessage);
      res.status(200).send("Request successful!");

    } else if (whatsappMessage === "49" && userDetails && userDetails.state === "subscriptionMenu") {
      // Check subscription status
      const statusMessage = await getSubscriptionStatusMessage(recipientPhone);
      await sendMessage(recipientPhone, statusMessage);
      res.status(200).send("Request successful!");

    } else {
      if (!userDetails) {
        await sendMessage(recipientPhone, menuMessage);
        res.status(200).send("New user added");
      } else {
        if (userDetails!.state === "menu") {
          await sendMessage(recipientPhone, menuMessage);
        } else if (
          userDetails!.state === "registeringAsARider" &&
          userDetails!.processingState === "1"
        ) {
          const registerName = whatsappMessage;
          const nameRegex = /^[A-Za-z]{2,}$/;

          if (!nameRegex.test(registerName) || !registerName) {
            await sendMessage(recipientPhone, namePromptMessage);
            res.status(400).send("Invalid Name");
          } else {
            await User.findOneAndUpdate(
              { phone: recipientPhone },
              { processingState: "2" }
            );

            await sendMessage(recipientPhone, licensePlatePromptMessage);

            await riderRequest.findOneAndUpdate(
              { phone: recipientPhone },
              { name: registerName.toUpperCase() }
            );

            res.status(200).send("Request successful!");
          }
        } else if (
          userDetails!.state === "registeringAsARider" &&
          userDetails!.processingState === "2"
        ) {
          const licenseNo = whatsappMessage;
          const licenseNoRegex = /^[A-Za-z0-9]+$/;

          if (
            !licenseNo ||
            (!licenseNoRegex.test(licenseNo) && licenseNo.length < 4)
          ) {
            await sendMessage(recipientPhone, licensePromptMessage);
          } else {
            await sendMessage(
              recipientPhone,
              `✅ *Thank you for registering as a VROOM Rider* 🏍️\n\n📩 You'll receive notification once approved.`
            );
            userDetails!.state = "menu";
            userDetails!.processingState = "3";
            const saveDetails = await userDetails!.save();
            if (!saveDetails) {
              res.status(500).send("Failed to save user details");
            }

            const code = await generateUniqueACCode();
            const registeredAt = formatDate();

            await riderRequest.findOneAndUpdate(
              { phone: recipientPhone },
              { licenseNo: licenseNo, registeredAt, code }
            );

            const riderReq = await riderRequest.findOne({
              phone: recipientPhone,
            });

            await Promise.all(
              admin.map((num) =>
                sendMessage(
                  num,
                  riderRegisterationAlert(
                    riderReq!.name,
                    riderReq!.phone,
                    riderReq!.licenseNo.toUpperCase(),
                    riderReq!.registeredAt,
                    riderReq!.code.toUpperCase()
                  )
                )
              )
            );

            res.status(200).send("Request successful!");
          }
        } else if (
          userDetails!.state === "RequestingARide" &&
          userDetails!.rideRequest === "1"
        ) {
          const userLocation = whatsappMessage;
          if (userLocation.length < 4) {
            await sendMessage(recipientPhone, locationPromptMessage);
            res.status(400).send("Invalid location");
          } else {
            await RideOrder.findOneAndUpdate(
              { userPhone: recipientPhone },
              { location: userLocation }
            );

            await sendMessage(recipientPhone, destinationMessage);

            userDetails!.rideRequest = "2";
            const saveDetails = await userDetails!.save();
            if (!saveDetails) {
              res.status(500).send("Failed to save user details");
            }

            res.status(200).send("Request successful!");
          }
        } else if (
          userDetails!.state === "RequestingARide" &&
          userDetails!.rideRequest === "2"
        ) {
          const availablePhones = await Rider.find({}, "phone").lean();

          const userDestination = whatsappMessage;
          if (userDestination.length < 4) {
            await sendMessage(recipientPhone, destinationPromptMessage);
            res.status(400).send("Invalid location");
          } else {
            const acceptCode = await generateAcceptCode();

            await RideOrder.findOneAndUpdate(
              { userPhone: recipientPhone },
              { destination: userDestination, acceptCode }
            );

            await sendMessage(
              recipientPhone,
              "*Thank you for choosing VROOM.*\nPlease wait while we assign you a rider.\n\nIf you wish to cancel this process, reply with *9*"
            );

            const order = await RideOrder.findOne({
              userPhone: recipientPhone,
            });

            const riderPhoneNumbers = availablePhones.map((r) => r!.phone);

            await Promise.all(
              riderPhoneNumbers.map((num) =>
                sendMessage(
                  num,
                  rideNotification(
                    order!.location,
                    order!.destination,
                    order!.userPhone,
                    order!.acceptCode.toUpperCase()
                  )
                )
              )
            );

            userDetails!.rideRequest = "3";
            const saveDetails = await userDetails!.save();
            if (!saveDetails) {
              res.status(500).send("Failed to save user details");
            }

            res.status(200).send("Request successful!");
          }
        } else if (
          userDetails!.state === "RequestingARide" &&
          userDetails!.rideRequest === "3"
        ) {
          await sendMessage(
            recipientPhone,
            "⏳ *Thank you for choosing VROOM.*\nPlease wait while we assign you a rider.\n\nIf you wish to cancel this process, reply with *9*"
          );
          res.status(200).send("Request successful!");
        } else if (
          userDetails!.state === "RequestingARide" &&
          userDetails!.rideRequest === "4"
        ) {
          await sendMessage(
            recipientPhone,
            "📱To return back to *MENU*, reply with *7*"
          );
          res.status(200).send("Request successful!");
        } else if (userDetails!.state === "subscriptionMenu") {
          // Handle invalid subscription menu options
          await sendMessage(
            recipientPhone,
            "❌ *INVALID OPTION*\n\nPlease select valid option:\n• 41 - Free Plan Info\n• 42 - Upgrade to Basic\n• 43 - Upgrade to Premium\n• 44 - Manage Subscription\n• 45 - Cancel Subscription\n• 49 - Check Status\n• 0 - Back to Main Menu"
          );
          res.status(200).send("Request successful!");
        }
      }
    }
  } catch (error) {
    res.status(500).json({
      message: "Server error. Cannot make request.",
    });
    console.error(error);
  }
};

// Enhanced webhook endpoint to handle Paystack subscription notifications
export const handlePaystackWebhook = async (req: Request, res: Response) => {
  try {
    const event = req.body;
    // Invalidate relevant caches
    cache.del('user_subs_*'); // Clear all user subscription caches
    if (event.event === 'subscription.create' || event.event === 'charge.success' || event.event === 'subscription.not_renew') {
      const { customer, plan, amount, subscription_code } = event.data;
      // Find user by Paystack customer ID
      const user = await User.findOne({ phone: customer.phone });
      if (!user) {
        console.log('User not found for Paystack customer:', customer.id);
        return res.status(200).send('Webhook processed - user not found');
      }
      else{
        //update paystackId if not set
        user.paystackId = customer.id;
        await user.save();
      }
      if (event.event === 'subscription.not_renew') {
        // Subscription cancelled or not renewing
        await Subscription.findOneAndUpdate(
          { subscriptionCode: subscription_code },
          { status: 'cancelled' }
        );
        // Initialize free subscription
        await initializeFreeSubscription(user.phone);
        await sendMessage(
          user.phone,
          `❌ *SUBSCRIPTION ENDED*\n\nYour subscription has been cancelled. Switched back to FREE plan. 🔄`
        );
        return res.status(200).send('Webhook processed - subscription cancelled');
      }
      if (subscription_code) {
        let planType: 'free' | 'basic' | 'premium' = 'free';
        let price = 0;

        // Determine plan based on amount
        if (amount === 100000) { // ₦1,000 in kobo
          planType = 'basic';
          price = 1000;
        } else if (amount === 300000) { // ₦3,000 in kobo
          planType = 'premium';
          price = 3000;
        }
        // Create new subscription record
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription
        await Subscription.findOneAndUpdate(
          { 
            userId: user.phone,
            subscriptionCode: subscription_code
          },
          {
            plan: planType,
            status: 'active',
            startDate,
            endDate,
            price,
            subscriptionCode: subscription_code,
            paystackCustomerId: customer.id
          },
          { upsert: true, new: true }
        );

        // Notify user
        await sendMessage(
          user.phone,
          `✅ *SUBSCRIPTION ACTIVATED!*\n\n🎉 ${planType.toUpperCase()} plan activated!\n📅 Valid until: ${formatDate(endDate)}\n💰 Amount: ₦${price}\n\nEnjoy your rides! 🚗`
        );
      }
      if (event.event === 'charge.success') {
        // Subscription renewed
        let planType: 'free' | 'basic' | 'premium' = 'free';
        let price = 0;
        if (amount === 100000) { // ₦1,000 in kobo
          planType = 'basic';
          price = 1000;
        } else if (amount === 300000) { // ₦3,000 in kobo
          planType = 'premium';
          price = 3000;
        }
        await sendMessage(
          user.phone,
          `🔄 *SUBSCRIPTION PAID*\n\nYour ${planType.toUpperCase()} plan has been renewed.\n💰 Amount: ₦${price}`
        );
        return res.status(200).send('Webhook processed - subscription renewed');
      }
    }

    res.status(200).send('Webhook processed');
  } catch (error) {
    console.error('Paystack webhook error:', error);
    res.status(500).send('Webhook processing failed');
  }
};
