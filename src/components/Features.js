import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Sparkles, Palette, Edit3, Mail, Zap, Award } from 'lucide-react';

export default function Features() {
  const features = [
    {
      icon: Sparkles,
      title: 'Brilliant in Seconds',
      description: 'Our advanced AI understands your needs and creates professional email templates instantly.',
      gradient: 'from-spark to-spark-hover'
    },
    {
      icon: Palette,
      title: 'Always On-Brand',
      description: 'Get stunning, responsive email designs that match your brand perfectly every time.',
      gradient: 'from-spark-hover to-spark-active'
    },
    {
      icon: Edit3,
      title: 'Simple for Everyone',
      description: 'Customize your emails with our intuitive drag-and-drop editor. No learning curve.',
      gradient: 'from-spark to-spark-active'
    },
    {
      icon: Mail,
      title: 'ESP Integration',
      description: 'Send campaigns directly to Mailchimp, SendGrid, and other platforms with one click.',
      gradient: 'from-spark-active to-spark'
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Generate professional emails in seconds, not hours.',
      gradient: 'from-spark-hover to-spark'
    },
    {
      icon: Award,
      title: 'Smarter Over Time',
      description: 'AI that learns and improves, delivering better results with every campaign.',
      gradient: 'from-spark to-spark-hover'
    }
  ];

  return (
    <section className="py-24 px-6 bg-gradient-to-b from-brillu-bg to-white">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tight">
            Why Choose Brillu?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to create brilliant email campaigns
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={index} 
                className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50 bg-card/50 backdrop-blur-sm"
              >
                <CardHeader className="space-y-4">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
