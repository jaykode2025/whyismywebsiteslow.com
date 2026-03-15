import { PROBLEMS, PLATFORMS, INDUSTRIES } from "../data/pseo";

// Generate static paths for all dynamic routes
export const generateProblemPaths = () => PROBLEMS.map(p => ({params: {slug: p.slug}}));
export const generatePlatformPaths = () => PLATFORMS.map(p => ({params: {slug: p.platform}}));
export const generateIndustryPaths = () => INDUSTRIES.map(i => ({params: {slug: i.industry}}));
