import { PROBLEMS, PLATFORMS, INDUSTRIES } from "../data/pseo";

// Content quality validation functions
export const validateContentQuality = (content: string, keyword: string) => {
  const minLength = 300; // Minimum content length for quality
  const minKeywordDensity = 0.01; // 1%
  const maxKeywordDensity = 0.03; // 3%
  
  const wordCount = content.split(/\s+/).length;
  const keywordCount = (content.toLowerCase().match(new RegExp(keyword.toLowerCase(), 'g')) || []).length;
  const keywordDensity = wordCount > 0 ? keywordCount / wordCount : 0;
  
  return {
    wordCount,
    keywordDensity,
    isLongEnough: wordCount >= minLength,
    hasGoodKeywordDensity: keywordDensity >= minKeywordDensity && keywordDensity <= maxKeywordDensity,
    isValid: wordCount >= minLength && keywordDensity >= minKeywordDensity && keywordDensity <= maxKeywordDensity
  };
};

// Check for duplicate content
export const checkForDuplicateContent = (newContent: string, existingContents: string[]) => {
  const similarityThreshold = 0.8; // 80% similarity considered duplicate
  
  for (const existing of existingContents) {
    const similarity = calculateTextSimilarity(newContent, existing);
    if (similarity > similarityThreshold) {
      return { isDuplicate: true, similarity, existingContent: existing };
    }
  }
  
  return { isDuplicate: false, similarity: 0, existingContent: null };
};

// Simple text similarity algorithm (Jaccard similarity)
const calculateTextSimilarity = (text1: string, text2: string): number => {
  const words1 = new Set(text1.toLowerCase().match(/\b\w+\b/g) || []);
  const words2 = new Set(text2.toLowerCase().match(/\b\w+\b/g) || []);
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
};

// Validate all entries in data
export const validateAllEntries = () => {
  const allValidations = [];
  
  // Validate problems
  for (const problem of PROBLEMS) {
    const content = `${problem.h1} ${problem.metaDescription} ${problem.primaryCause} ${problem.detailedAnalysis.join(' ')} ${problem.quickWins.join(' ')} ${problem.solutions.map(s => `${s.title} ${s.description} ${s.steps.join(' ')}`).join(' ')} ${problem.faqs.map(f => `${f.question} ${f.answer}`).join(' ')}`;
    
    allValidations.push({
      type: 'problem',
      slug: problem.slug,
      ...validateContentQuality(content, problem.keyword)
    });
  }
  
  // Validate platforms
  for (const platform of PLATFORMS) {
    const content = `${platform.keyword} ${platform.topIssues.join(' ')} ${platform.commonSolutions.join(' ')}`;
    
    allValidations.push({
      type: 'platform',
      platform: platform.platform,
      ...validateContentQuality(content, platform.keyword)
    });
  }
  
  // Validate industries
  for (const industry of INDUSTRIES) {
    const content = `${industry.keyword} ${industry.conversionImpact} ${industry.stats.map(s => `${s.value} ${s.label}`).join(' ')}`;
    
    allValidations.push({
      type: 'industry',
      industry: industry.industry,
      ...validateContentQuality(content, industry.keyword)
    });
  }
  
  return allValidations;
};

// Generate content suggestions for improvement
export const getContentSuggestions = (content: string, keyword: string) => {
  const validation = validateContentQuality(content, keyword);
  const suggestions = [];
  
  if (!validation.isLongEnough) {
    suggestions.push(`Add ${300 - validation.wordCount} more words to meet minimum content length`);
  }
  
  if (!validation.hasGoodKeywordDensity) {
    const targetDensity = 0.02; // 2%
    const currentCount = validation.keywordDensity * validation.wordCount;
    const targetCount = targetDensity * validation.wordCount;
    const diff = Math.round(targetCount - currentCount);
    
    if (diff > 0) {
      suggestions.push(`Add ${diff} more instances of the keyword "${keyword}"`);
    } else {
      suggestions.push(`Reduce keyword usage by ${Math.abs(diff)} instances to avoid stuffing`);
    }
  }
  
  return {
    isValid: validation.isValid,
    suggestions,
    currentMetrics: {
      wordCount: validation.wordCount,
      keywordDensity: `${(validation.keywordDensity * 100).toFixed(2)}%`
    }
  };
};