import { MOCK_RULE_REVIEWS, RuleReview } from "@/app/data/ruleReviews";

// In-memory store — seeded from mock data, resets on server restart.
// Replace with a real DB query when ready.
export const reviews: RuleReview[] = [...MOCK_RULE_REVIEWS];
