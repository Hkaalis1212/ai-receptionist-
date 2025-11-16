import { storage } from "./storage";

// Initialize default subscription for the organization
async function initSubscription() {
  try {
    const existing = await storage.getSubscription("default");
    if (!existing) {
      await storage.upsertSubscription({
        organizationId: "default",
        plan: "free",
        status: "trialing",
        maxTeamMembers: 3,
        currentTeamMembers: 0,
      });
      console.log("✓ Default subscription initialized");
    } else {
      console.log("✓ Subscription already exists");
    }
  } catch (error) {
    console.error("Failed to initialize subscription:", error);
  }
}

initSubscription();
