import React from 'react';
import { Check, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';

export default function Pricing({ onSignUp }) {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      features: [
        '3 AI-generated emails',
        'GPT-5 Standard AI',
        'Basic templates',
        'Email preview',
        'Export to HTML'
      ],
      cta: 'Try for Free',
      highlighted: false
    },
    {
      name: 'Starter',
      price: '$9',
      period: '/month',
      popular: true,
      features: [
        '100 AI-generated emails/month',
        'GPT-5 Standard AI',
        'Save preferences & brands',
        'Multiple brand support',
        'Email editor',
        'Export to HTML/MJML',
        'Mailchimp integration',
        'Email support'
      ],
      cta: 'Start Now',
      highlighted: true
    },
    {
      name: 'Pro',
      price: '$29',
      period: '/month',
      features: [
        '500 AI-generated emails/month',
        'GPT-5 Standard AI',
        'Everything in Starter',
        'Priority support',
        'Advanced templates',
        'A/B testing',
        'Analytics dashboard'
      ],
      cta: 'Start Now',
      highlighted: false
    },
    {
      name: 'Business',
      price: '$99',
      period: '/month',
      badge: 'Best Value',
      features: [
        '2,500 AI-generated emails/month',
        'GPT-5 Standard AI',
        'Everything in Pro',
        'Team collaboration (3 seats)',
        'Custom branding',
        'Priority support',
        'Dedicated account manager'
      ],
      cta: 'Start Now',
      highlighted: false
    }
  ];

  return (
    <section id="pricing" className="py-20 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tight mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            All plans powered by <strong className="text-spark">GPT-5 Standard</strong> — the same powerful AI for everyone
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`relative ${
                plan.highlighted 
                  ? 'border-2 border-primary shadow-xl scale-105 z-10' 
                  : 'hover:shadow-lg transition-shadow'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-spark to-spark-hover text-white px-4 py-1">
                    Most Popular
                  </Badge>
                </div>
              )}
              {plan.badge && !plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge variant="secondary" className="px-4 py-1">
                    💎 {plan.badge}
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-8 pt-8">
                <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                <div className="mb-4">
                  <span className="text-5xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground ml-2">{plan.period}</span>
                </div>
                <Badge variant="outline" className="mx-auto">
                  <Sparkles className="w-3 h-3 mr-1" />
                  GPT-5 Standard
                </Badge>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button
                  className={`w-full ${plan.highlighted ? '' : 'variant-outline'}`}
                  variant={plan.highlighted ? 'default' : 'outline'}
                  size="lg"
                  onClick={onSignUp}
                >
                  {plan.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground max-w-3xl mx-auto">
            💡 All plans include user preferences, RAG-enhanced personalization, unlimited brands, and the same powerful GPT-5 Standard AI model. 
            Prices in USD. Cancel anytime.
          </p>
        </div>
      </div>
    </section>
  );
}
