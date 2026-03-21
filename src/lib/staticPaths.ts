import { PROBLEMS, PLATFORMS, INDUSTRIES, LOCATIONS } from "../data/pseo";

// Generate static paths for all dynamic routes
export const generateProblemPaths = () => PROBLEMS.map(p => ({params: {slug: p.slug}}));
export const generatePlatformPaths = () => PLATFORMS.map(p => ({params: {slug: p.platform}}));
export const generateIndustryPaths = () => INDUSTRIES.map(i => ({params: {slug: i.industry}}));
export const generateLocationPaths = () => LOCATIONS.map(l => ({params: {slug: l.location}}));
