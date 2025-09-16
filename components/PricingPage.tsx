
import React from 'react';
import { ArrowLeftIcon, CheckmarkIcon } from './Icons';

interface PricingPageProps {
  onBack: () => void;
}

const PricingTier: React.FC<{
  name: string;
  price: string;
  description: string;
  features: string[];
  isPopular?: boolean;
}> = ({ name, price, description, features, isPopular = false }) => {
  const popularBadge = isPopular ? (
    <div className="absolute top-0 right-4 -mt-3">
      <span className="bg-cyan-400 text-slate-900 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Most Popular</span>
    </div>
  ) : null;

  const tierClasses = `bg-slate-800/50 rounded-xl p-6 shadow-lg border h-full flex flex-col relative ${isPopular ? 'border-cyan-400' : 'border-slate-700'}`;

  return (
    <div className={tierClasses}>
      {popularBadge}
      <h3 className="text-2xl font-semibold text-white">{name}</h3>
      <p className="text-slate-400 mt-2">{description}</p>
      <div className="mt-6">
        <span className="text-5xl font-bold text-white">${price}</span>
        <span className="text-slate-400">/month</span>
      </div>
      <ul className="mt-8 space-y-3 text-slate-300 flex-grow">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center">
            <CheckmarkIcon className="w-5 h-5 text-cyan-400 mr-3 flex-shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <button className={`w-full mt-8 py-3 font-semibold rounded-lg transition-colors duration-300 ${isPopular ? 'bg-cyan-500 text-white hover:bg-cyan-600' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'}`}>
        Choose Plan
      </button>
    </div>
  );
};

export const PricingPage: React.FC<PricingPageProps> = ({ onBack }) => {
  return (
    <div className="animate-fade-in">
      <div className="flex items-center mb-10">
        <button 
          onClick={onBack} 
          className="inline-flex items-center text-slate-300 hover:text-cyan-400 transition-colors mr-4"
          aria-label="Back to editor"
        >
          <ArrowLeftIcon className="w-6 h-6" />
        </button>
        <h2 className="text-3xl font-bold text-white">Choose Your Plan</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <PricingTier
          name="Creator"
          price="8"
          description="Perfect for getting started and exploring creative ideas."
          features={[
            "100 credits/month",
            "Standard image generation",
            "4K image upscaling",
            "5 video generations/month",
          ]}
        />
        <PricingTier
          name="Pro"
          price="15"
          description="For professionals and enthusiasts who need more power."
          features={[
            "300 credits/month",
            "Priority image generation",
            "4K & 8K image upscaling",
            "20 video generations/month",
            "Access to new features"
          ]}
          isPopular={true}
        />
        <PricingTier
          name="Visionary"
          price="25"
          description="The ultimate toolkit for boundless creative projects."
          features={[
            "Unlimited credits",
            "Highest priority queue",
            "4K & 8K image upscaling",
            "50 video generations/month",
            "Dedicated support"
          ]}
        />
      </div>
    </div>
  );
};
