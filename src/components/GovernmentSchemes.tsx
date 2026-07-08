/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { LanguageCode, translations, GovernmentScheme } from '../types';
import { Landmark, Search, ShieldCheck, HelpCircle, ExternalLink, Award, FileText, CheckCircle } from 'lucide-react';

interface GovernmentSchemesProps {
  currentLang: LanguageCode;
}

export default function GovernmentSchemes({ currentLang }: GovernmentSchemesProps) {
  const t = translations[currentLang];
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'subsidy' | 'insurance' | 'income'>('all');
  const [enrolledSchemes, setEnrolledSchemes] = useState<string[]>([]);

  const schemes: Array<GovernmentScheme & { category: 'subsidy' | 'insurance' | 'income' }> = [
    {
      id: 'pm-kisan',
      category: 'income',
      name: 'Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)',
      benefits: 'Direct cash transfer of ₹6,000 per year in three equal installments of ₹2,000 directly into the bank accounts of small and marginal farmers.',
      eligibility: 'All small and marginal landholding farmer families who have cultivable landholding in their names.',
      howToApply: 'Register online via the PM-Kisan Portal (pmkisan.gov.in) or visit your nearest Common Service Centre (CSC) with your Aadhaar and land records.',
      linkPlaceholder: 'https://pmkisan.gov.in'
    },
    {
      id: 'fasal-bima',
      category: 'insurance',
      name: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
      benefits: 'Comprehensive crop insurance against damage from natural calamities, pests, and diseases. Farmers pay a very low premium (1.5% to 2% for food crops, 5% for commercial crops).',
      eligibility: 'All farmers growing notified crops in notified areas, including sharecroppers and tenant farmers.',
      howToApply: 'Apply through your financing bank, crop insurance agent, or directly on the National Crop Insurance Portal (pmfby.gov.in).',
      linkPlaceholder: 'https://pmfby.gov.in'
    },
    {
      id: 'fertilizer-subsidy',
      category: 'subsidy',
      name: 'Nutrient Based Subsidy (NBS) & Fertilizer Subsidy',
      benefits: 'Provides urea, DAP, and other critical fertilizers to farmers at highly subsidized, controlled rates through authorized dealers.',
      eligibility: 'All active agricultural farmers purchasing fertilizers for direct cultivation.',
      howToApply: 'Purchase fertilizers through POS-enabled retail outlets using Aadhaar authentication or Farmer ID card.',
      linkPlaceholder: 'https://urvarak.nic.in'
    },
    {
      id: 'seed-scheme',
      category: 'subsidy',
      name: 'Subsidized Quality Seeds Distribution',
      benefits: 'Up to 50% subsidy on high-yield variety (HYV) certified seeds of wheat, paddy, pulses, and oilseeds to improve productivity.',
      eligibility: 'Small and marginal farmers, with priority given to women farmers and SC/ST groups.',
      howToApply: 'Apply at your local Block Development Office (BDO) or Regional Krishi Vigyan Kendra (KVK).',
      linkPlaceholder: 'https://seednet.gov.in'
    },
    {
      id: 'machinery-subsidy',
      category: 'subsidy',
      name: 'Sub-Mission on Agricultural Mechanization (SMAM)',
      benefits: 'Provides 40% to 50% financial subsidy for purchasing modern farming equipment such as tractors, rotavators, power tillers, and drip irrigation systems.',
      eligibility: 'Farmers, cooperative societies, and self-help groups.',
      howToApply: 'Apply online on the SMAM portal (agrimachinery.nic.in) or contact the District Agricultural Engineering block.',
      linkPlaceholder: 'https://agrimachinery.nic.in'
    }
  ];

  const filteredSchemes = schemes.filter(scheme => {
    const matchesSearch = scheme.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          scheme.benefits.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          scheme.eligibility.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || scheme.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleEnroll = (id: string) => {
    if (enrolledSchemes.includes(id)) {
      setEnrolledSchemes(prev => prev.filter(s => s !== id));
    } else {
      setEnrolledSchemes(prev => [...prev, id]);
    }
  };

  return (
    <div id="government-schemes-panel" className="space-y-6">
      {/* Category selector and search bar */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              id="schemes-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search schemes, eligibility, or benefits..."
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-700"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
            <button
              id="category-all-btn"
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
                selectedCategory === 'all' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Schemes
            </button>
            <button
              id="category-income-btn"
              onClick={() => setSelectedCategory('income')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
                selectedCategory === 'income' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Direct Cash Income
            </button>
            <button
              id="category-subsidy-btn"
              onClick={() => setSelectedCategory('subsidy')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
                selectedCategory === 'subsidy' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Subsidies
            </button>
            <button
              id="category-insurance-btn"
              onClick={() => setSelectedCategory('insurance')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
                selectedCategory === 'insurance' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Crop Insurance
            </button>
          </div>
        </div>
      </div>

      {/* Schemes Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredSchemes.map((scheme) => (
          <div key={scheme.id} className="bg-white border border-slate-100 hover:border-emerald-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between transition-all duration-200 relative overflow-hidden">
            
            {/* Category tag */}
            <div className="absolute top-0 right-0 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-3 py-1.5 rounded-bl-xl uppercase tracking-wider">
              {scheme.category === 'income' ? 'Financial Assistance' : scheme.category === 'subsidy' ? 'Agricultural Subsidy' : 'Crop Protection'}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100 shrink-0">
                  <Landmark size={20} />
                </div>
                <h4 className="text-base font-bold text-slate-800 pr-20 leading-snug">{scheme.name}</h4>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block flex items-center gap-1">
                    <Award size={10} /> Scheme Benefits
                  </span>
                  <p className="text-xs text-slate-600 font-semibold leading-relaxed mt-0.5">{scheme.benefits}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block flex items-center gap-1">
                    <ShieldCheck size={10} /> Eligibility Criteria
                  </span>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed mt-0.5">{scheme.eligibility}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block flex items-center gap-1">
                    <HelpCircle size={10} /> How to Apply
                  </span>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed mt-0.5">{scheme.howToApply}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 border-t border-slate-50 pt-4 mt-4">
              <a
                href={scheme.linkPlaceholder}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
              >
                Official Portal <ExternalLink size={12} />
              </a>
              <button
                id={`enroll-${scheme.id}`}
                onClick={() => handleEnroll(scheme.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                  enrolledSchemes.includes(scheme.id)
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-black'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow hover:shadow-emerald-600/10'
                }`}
              >
                {enrolledSchemes.includes(scheme.id) ? (
                  <>
                    <CheckCircle size={12} />
                    Interested
                  </>
                ) : (
                  'Mark Interest'
                )}
              </button>
            </div>
          </div>
        ))}

        {filteredSchemes.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-100">
            <Landmark size={48} className="text-slate-300 mx-auto mb-3" />
            <h4 className="font-bold text-slate-700">No schemes matched your search</h4>
            <p className="text-xs text-slate-400 mt-1">Try resetting filters or searching for terms like "urea" or "samman".</p>
          </div>
        )}
      </div>
    </div>
  );
}
