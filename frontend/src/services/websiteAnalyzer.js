import api from './api';
import { SEO_THRESHOLDS, ISSUE_TYPES } from '../utils/constants';
import { validateMetaTitle, validateMetaDescription, validateUrl } from '../utils/validators';

// Website analyzer service
class WebsiteAnalyzer {
  // Analyze complete website
  async analyzeWebsite(websiteId, options = {}) {
    const {
      includePageSpeed = true,
      includeTechnical = true,
      includeContent = true,
      includeCompetitors = false,
      forceRefresh = false
    } = options;
    
    try {
      const analysis = await api.post(`/websites/${websiteId}/analyze`, {
        includePageSpeed,
        includeTechnical,
        includeContent,
        includeCompetitors,
        forceRefresh
      });
      
      // Process and enhance analysis results
      return this.processAnalysisResults(analysis);
    } catch (error) {
      console.error('Website analysis error:', error);
      throw error;
    }
  }
  
  // Process analysis results
  processAnalysisResults(analysis) {
    const processed = {
      ...analysis,
      score: this.calculateOverallScore(analysis),
      summary: this.generateSummary(analysis),
      recommendations: this.generateRecommendations(analysis),
      priorities: this.prioritizeIssues(analysis.issues || [])
    };
    
    return processed;
  }
  
  // Calculate overall SEO score
  calculateOverallScore(analysis) {
    const weights = {
      technical: 0.3,
      content: 0.3,
      performance: 0.2,
      mobile: 0.2
    };
    
    let totalScore = 0;
    let totalWeight = 0;
    
    if (analysis.technical) {
      totalScore += (analysis.technical.score || 0) * weights.technical;
      totalWeight += weights.technical;
    }
    
    if (analysis.content) {
      totalScore += (analysis.content.score || 0) * weights.content;
      totalWeight += weights.content;
    }
    
    if (analysis.performance) {
      totalScore += (analysis.performance.score || 0) * weights.performance;
      totalWeight += weights.performance;
    }
    
    if (analysis.mobile) {
      totalScore += (analysis.mobile.score || 0) * weights.mobile;
      totalWeight += weights.mobile;
    }
    
    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }
  
  // Generate analysis summary
  generateSummary(analysis) {
    const summary = {
      strengths: [],
      weaknesses: [],
      opportunities: [],
      threats: []
    };
    
    // Analyze technical aspects
    if (analysis.technical) {
      if (analysis.technical.https) {
        summary.strengths.push('Website uses HTTPS');
      } else {
        summary.threats.push('Website not using HTTPS');
      }
      
      if (analysis.technical.responseTime < 2000) {
        summary.strengths.push('Fast server response time');
      } else if (analysis.technical.responseTime > 4000) {
        summary.weaknesses.push('Slow server response time');
      }
    }
    
    // Analyze content
    if (analysis.content) {
      if (analysis.content.uniqueContent > 80) {
        summary.strengths.push('High unique content ratio');
      } else if (analysis.content.uniqueContent < 50) {
        summary.weaknesses.push('Low unique content ratio');
      }
      
      if (analysis.content.missingAltTags > 10) {
        summary.opportunities.push('Add alt tags to images');
      }
    }
    
    // Analyze performance
    if (analysis.performance) {
      const score = analysis.performance.score || 0;
      if (score >= 90) {
        summary.strengths.push('Excellent page performance');
      } else if (score < 50) {
        summary.threats.push('Poor page performance affecting SEO');
      }
    }
    
    return summary;
  }
  
  // Generate recommendations
  generateRecommendations(analysis) {
    const recommendations = [];
    
    // Technical recommendations
    if (!analysis.technical?.https) {
      recommendations.push({
        priority: 'high',
        category: 'technical',
        title: 'Enable HTTPS',
        description: 'Secure your website with HTTPS to improve security and SEO',
        impact: 'high',
        effort: 'medium'
      });
    }
    
    if (analysis.technical?.responseTime > SEO_THRESHOLDS.PAGE_LOAD_TIME.AVERAGE) {
      recommendations.push({
        priority: 'high',
        category: 'performance',
        title: 'Improve Server Response Time',
        description: 'Optimize server configuration and reduce response time',
        impact: 'high',
        effort: 'medium'
      });
    }
    
    // Content recommendations
    if (analysis.content?.titleIssues > 0) {
      recommendations.push({
        priority: 'high',
        category: 'content',
        title: 'Fix Page Titles',
        description: `${analysis.content.titleIssues} pages have title issues`,
        impact: 'high',
        effort: 'low'
      });
    }
    
    if (analysis.content?.descriptionIssues > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'content',
        title: 'Optimize Meta Descriptions',
        description: `${analysis.content.descriptionIssues} pages need better descriptions`,
        impact: 'medium',
        effort: 'low'
      });
    }
    
    // Performance recommendations
    if (analysis.performance?.score < 50) {
      recommendations.push({
        priority: 'high',
        category: 'performance',
        title: 'Optimize Page Speed',
        description: 'Improve loading speed for better user experience and SEO',
        impact: 'high',
        effort: 'high'
      });
    }
    
    // Sort by priority and impact
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const impactOrder = { high: 0, medium: 1, low: 2 };
      
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      
      return impactOrder[a.impact] - impactOrder[b.impact];
    });
  }
  
  // Prioritize issues
  prioritizeIssues(issues) {
    if (!Array.isArray(issues)) return [];
    
    return issues
      .map(issue => ({
        ...issue,
        weight: this.calculateIssueWeight(issue)
      }))
      .sort((a, b) => b.weight - a.weight);
  }
  
  // Calculate issue weight for prioritization
  calculateIssueWeight(issue) {
    const severityWeights = {
      critical: 10,
      high: 5,
      medium: 3,
      low: 1,
      info: 0
    };
    
    const impactWeights = {
      high: 3,
      medium: 2,
      low: 1
    };
    
    const severityWeight = severityWeights[issue.severity] || 0;
    const impactWeight = impactWeights[issue.impact] || 1;
    const affectedPages = issue.affectedPages || 1;
    
    return severityWeight * impactWeight * Math.log(affectedPages + 1);
  }
  
  // Analyze page SEO
  async analyzePage(url, options = {}) {
    try {
      const analysis = await api.post('/analyze/page', { url, ...options });
      return this.processPageAnalysis(analysis);
    } catch (error) {
      console.error('Page analysis error:', error);
      throw error;
    }
  }
  
  // Process page analysis
  processPageAnalysis(analysis) {
    const processed = { ...analysis };
    
    // Validate and score meta tags
    if (analysis.meta) {
      processed.meta.titleValidation = validateMetaTitle(analysis.meta.title);
      processed.meta.descriptionValidation = validateMetaDescription(analysis.meta.description);
    }
    
    // Calculate page score
    processed.score = this.calculatePageScore(analysis);
    
    // Generate page-specific recommendations
    processed.recommendations = this.generatePageRecommendations(analysis);
    
    return processed;
  }
  
  // Calculate page SEO score
  calculatePageScore(analysis) {
    let score = 100;
    const deductions = [];
    
    // Meta tags
    if (!analysis.meta?.title) {
      score -= 20;
      deductions.push({ reason: 'Missing title', points: -20 });
    } else {
      const titleValidation = validateMetaTitle(analysis.meta.title);
      if (titleValidation.warnings.length > 0) {
        score -= 10;
        deductions.push({ reason: 'Title issues', points: -10 });
      }
    }
    
    if (!analysis.meta?.description) {
      score -= 15;
      deductions.push({ reason: 'Missing description', points: -15 });
    } else {
      const descValidation = validateMetaDescription(analysis.meta.description);
      if (descValidation.warnings.length > 0) {
        score -= 5;
        deductions.push({ reason: 'Description issues', points: -5 });
      }
    }
    
    // Headings
    if (!analysis.headings?.h1 || analysis.headings.h1.length === 0) {
      score -= 15;
      deductions.push({ reason: 'Missing H1', points: -15 });
    } else if (analysis.headings.h1.length > 1) {
      score -= 5;
      deductions.push({ reason: 'Multiple H1 tags', points: -5 });
    }
    
    // Images
    if (analysis.images?.withoutAlt > 0) {
      const penalty = Math.min(10, analysis.images.withoutAlt);
      score -= penalty;
      deductions.push({ reason: 'Images without alt text', points: -penalty });
    }
    
    // Performance
    if (analysis.performance?.loadTime > SEO_THRESHOLDS.PAGE_LOAD_TIME.SLOW) {
      score -= 10;
      deductions.push({ reason: 'Slow page load', points: -10 });
    }
    
    return {
      score: Math.max(0, score),
      deductions
    };
  }
  
  // Generate page recommendations
  generatePageRecommendations(analysis) {
    const recommendations = [];
    
    // Meta tag recommendations
    if (!analysis.meta?.title) {
      recommendations.push({
        type: 'critical',
        message: 'Add a page title',
        impact: 'high'
      });
    } else {
      const titleValidation = validateMetaTitle(analysis.meta.title);
      titleValidation.warnings.forEach(warning => {
        recommendations.push({
          type: 'warning',
          message: warning,
          impact: 'medium'
        });
      });
    }
    
    if (!analysis.meta?.description) {
      recommendations.push({
        type: 'warning',
        message: 'Add a meta description',
        impact: 'medium'
      });
    } else {
      const descValidation = validateMetaDescription(analysis.meta.description);
      descValidation.warnings.forEach(warning => {
        recommendations.push({
          type: 'info',
          message: warning,
          impact: 'low'
        });
      });
    }
    
    // Heading recommendations
    if (!analysis.headings?.h1 || analysis.headings.h1.length === 0) {
      recommendations.push({
        type: 'critical',
        message: 'Add an H1 heading',
        impact: 'high'
      });
    } else if (analysis.headings.h1.length > 1) {
      recommendations.push({
        type: 'warning',
        message: 'Use only one H1 tag per page',
        impact: 'medium'
      });
    }
    
    // Image recommendations
    if (analysis.images?.withoutAlt > 0) {
      recommendations.push({
        type: 'warning',
        message: `Add alt text to ${analysis.images.withoutAlt} images`,
        impact: 'medium'
      });
    }
    
    return recommendations;
  }
  
  // Compare with competitors
  async compareWithCompetitors(websiteId, competitorIds) {
    try {
      const comparison = await api.post(`/websites/${websiteId}/compare`, {
        competitorIds
      });
      
      return this.processComparison(comparison);
    } catch (error) {
      console.error('Comparison error:', error);
      throw error;
    }
  }
  
  // Process comparison results
  processComparison(comparison) {
    const processed = { ...comparison };
    
    // Calculate relative performance
    processed.relativePerformance = this.calculateRelativePerformance(comparison);
    
    // Identify competitive advantages
    processed.advantages = this.identifyAdvantages(comparison);
    
    // Identify areas for improvement
    processed.improvements = this.identifyImprovements(comparison);
    
    return processed;
  }
  
  // Calculate relative performance
  calculateRelativePerformance(comparison) {
    const metrics = ['score', 'loadTime', 'mobileScore', 'contentScore'];
    const performance = {};
    
    metrics.forEach(metric => {
      if (comparison.own?.[metric] !== undefined) {
        const ownValue = comparison.own[metric];
        const competitorAvg = comparison.competitors
          .reduce((sum, comp) => sum + (comp[metric] || 0), 0) / comparison.competitors.length;
        
        performance[metric] = {
          own: ownValue,
          competitorAverage: competitorAvg,
          difference: ownValue - competitorAvg,
          percentageDiff: competitorAvg > 0 ? ((ownValue - competitorAvg) / competitorAvg) * 100 : 0
        };
      }
    });
    
    return performance;
  }
  
  // Identify competitive advantages
  identifyAdvantages(comparison) {
    const advantages = [];
    const performance = this.calculateRelativePerformance(comparison);
    
    Object.entries(performance).forEach(([metric, data]) => {
      if (data.percentageDiff > 10) {
        advantages.push({
          metric,
          advantage: `${Math.round(data.percentageDiff)}% better than competitors`,
          value: data.own
        });
      }
    });
    
    return advantages;
  }
  
  // Identify areas for improvement
  identifyImprovements(comparison) {
    const improvements = [];
    const performance = this.calculateRelativePerformance(comparison);
    
    Object.entries(performance).forEach(([metric, data]) => {
      if (data.percentageDiff < -10) {
        improvements.push({
          metric,
          gap: `${Math.round(Math.abs(data.percentageDiff))}% behind competitors`,
          targetValue: data.competitorAverage,
          currentValue: data.own
        });
      }
    });
    
    return improvements;
  }
}

// Create singleton instance
const websiteAnalyzer = new WebsiteAnalyzer();

export default websiteAnalyzer;