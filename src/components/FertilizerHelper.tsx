/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { LanguageCode, translations, FertilizerDetails } from '../types';
import { Search, ShieldAlert, BadgeCheck, XOctagon, Info, AlertTriangle, HelpCircle, ArrowRight, Heart } from 'lucide-react';

interface FertilizerHelperProps {
  currentLang: LanguageCode;
}

export default function FertilizerHelper({ currentLang }: FertilizerHelperProps) {
  const t = translations[currentLang];
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'Chemical' | 'Organic'>('all');
  const [selectedFertilizer, setSelectedFertilizer] = useState<string>('urea');

  const fertilizers: Record<string, FertilizerDetails & { id: string }> = {
    urea: {
      id: 'urea',
      name: 'Urea (यूरिया - 46% Nitrogen)',
      category: 'Chemical',
      advantages: [
        'Provides a high concentration of Nitrogen (46%), crucial for leafy growth.',
        'Highly soluble in water, allowing rapid uptake by plant roots.',
        'Highly economical compared to other commercial Nitrogen sources.'
      ],
      disadvantages: [
        'Leads to soil acidification if applied continuously over years.',
        'Excessive use results in soft vegetative growth, making crops highly vulnerable to pests.',
        'High nitrogen volatilization (loss as gas) if left on soil surface without irrigation.'
      ],
      dosage: 'Standard crop dosage: 50-100 kg per acre (split into 2-3 applications based on crop types). Never apply all at once.',
      applicationMethod: 'Broadcasting (splitting granules evenly) during cool hours of early morning or late evening. Follow immediately with light irrigation.',
      safetyPrecautions: [
        'Always wear gloves and masks to prevent skin contact and dust inhalation.',
        'Do not mix or store with ammonium nitrate under direct sunlight.',
        'Wash hands thoroughly with soap before eating or drinking.'
      ],
      organicAlternatives: [
        'Well-decomposed cow dung manure (FYM - Farm Yard Manure).',
        'Azotobacter / Rhizobium liquid bio-fertilizer.',
        'Mustard oil cake or neem oil cake powder.'
      ]
    },
    dap: {
      id: 'dap',
      name: 'DAP (डाय-अमोनियम फॉस्फेट - 18:46:0)',
      category: 'Chemical',
      advantages: [
        'Dual-action supply of Phosphorus (46%) and Nitrogen (18%) simultaneously.',
        'Promotes vigorous root development and early seedling growth.',
        'Excellent for basal application (applying at the time of sowing).'
      ],
      disadvantages: [
        'Highly alkaline near the granule, which can temporarily injure root hairs.',
        'Can get chemically fixed in highly clayey or alkaline soils, reducing absorption.',
        'Relatively expensive fertilizer with high import reliance.'
      ],
      dosage: 'Basal application: 40-50 kg per acre during land preparation or sowing.',
      applicationMethod: 'Placement or Band application (placing granules 2-3 inches below or next to seed rows) to prevent direct contact with root tips.',
      safetyPrecautions: [
        'Ensure storage in a cool, moisture-proof ventilated room.',
        'Use protective eyewear if applying during windy hours to prevent eye irritation.',
        'Avoid contact with open wounds.'
      ],
      organicAlternatives: [
        'Rock Phosphate powder combined with organic compost.',
        'Bone meal (contains high calcium and natural slow-release phosphorus).',
        'Phosphate Solubilizing Bacteria (PSB) bio-fertilizer.'
      ]
    },
    mop: {
      id: 'mop',
      name: 'MOP (म्यूरिएट ऑफ पोटाश - 60% Potassium)',
      category: 'Chemical',
      advantages: [
        'Delivers concentrated Potassium (60% K2O), boosting crop disease resistance.',
        'Improves starch and sugar accumulation, vital for potato, grain size, and sugarcane sweetness.',
        'Enhances drought tolerance by regulating stomata/transpiration.'
      ],
      disadvantages: [
        'Contains Chloride, which can harm sensitive crops like tobacco, grapes, and onion.',
        'Continuous use raises soil salinity index.'
      ],
      dosage: '25-40 kg per acre, applied in split dosages near flowering and fruit-setting stages.',
      applicationMethod: 'Side-dressing (band application along crop rows) followed by hoeing and watering.',
      safetyPrecautions: [
        'Wear protective breathing masks to avoid potash dust.',
        'Keep away from strong acids and oxidizing agents.'
      ],
      organicAlternatives: [
        'Wood ash (rich in natural slow-release potassium and calcium).',
        'Potash Mobilizing Bacteria (KMB) inoculants.',
        'Banana peel compost or seaweed extract.'
      ]
    },
    vermicompost: {
      id: 'vermicompost',
      name: 'Organic Vermicompost (केंचुआ खाद)',
      category: 'Organic',
      advantages: [
        'Rich in humic acids, micronutrients, beneficial bacteria, and plant growth regulators.',
        'Significantly improves soil moisture retention, structure, and aeration.',
        'Completely safe for crops, with zero risk of chemical burns.'
      ],
      disadvantages: [
        'Nutrient concentration (NPK) is lower compared to chemical concentrates, requiring bulk application.',
        'Takes longer to show visible color changes compared to chemical urea.'
      ],
      dosage: '2 to 3 tonnes per acre during land preparation, or 500g per plant for horticultural crops.',
      applicationMethod: 'Thorough mixing with topsoil during plowing, or applying in the basin around plant trunks.',
      safetyPrecautions: [
        'Store in shady, cool conditions to preserve live earthworm cocoons and beneficial microbes.',
        'Wear standard gardening gloves to prevent fungal contact from organic soil.'
      ],
      organicAlternatives: [
        'Standard leaf-mold compost, cow dung manure, or Panchagavya solution.'
      ]
    },
    neemcake: {
      id: 'neemcake',
      name: 'Neem Cake Fertilizer (नीम की खली)',
      category: 'Organic',
      advantages: [
        'Acts as a dual organic fertilizer and natural pesticide/nematicide.',
        'Inhibits nitrification, preventing nitrogen losses from the soil.',
        'Protects plant roots from nematodes, termites, and white grubs.'
      ],
      disadvantages: [
        'Has a strong bitter aroma that may temporarily attract specific flies but keeps pests away.',
        'Relatively slow releasing.'
      ],
      dosage: '100-150 kg per acre, applied during initial soil preparation.',
      applicationMethod: 'Soil incorporation. Mix evenly into the soil before sowing or transplanting.',
      safetyPrecautions: [
        'Keep out of reach of domestic animals as neem can cause stomach upset if eaten in heavy quantities.'
      ],
      organicAlternatives: [
        'Castor cake powder or Pongamia (Karanji) cake.'
      ]
    }
  };

  const filteredFertilizers = Object.values(fertilizers).filter(f => {
    return selectedCategory === 'all' || f.category === selectedCategory;
  });

  const active = fertilizers[selectedFertilizer] || fertilizers.urea;

  return (
    <div id="fertilizer-helper-panel" className="space-y-6">
      {/* Category switcher */}
      <div className="flex justify-between items-center bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex-col md:flex-row gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-800">{t.fertilizerAdvisor}</h3>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Learn proper dosage, safety precautions, and organic alternatives.</p>
        </div>
        <div className="flex gap-2">
          <button
            id="fertilizer-cat-all"
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
              selectedCategory === 'all' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            All
          </button>
          <button
            id="fertilizer-cat-chem"
            onClick={() => setSelectedCategory('Chemical')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
              selectedCategory === 'Chemical' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Chemical (उर्वरक)
          </button>
          <button
            id="fertilizer-cat-org"
            onClick={() => setSelectedCategory('Organic')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
              selectedCategory === 'Organic' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Organic (जैविक खाद)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left List */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-2">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block px-2">Select Fertilizer</span>
          {filteredFertilizers.map((f) => (
            <button
              id={`fert-item-${f.id}`}
              key={f.id}
              onClick={() => setSelectedFertilizer(f.id)}
              className={`w-full text-left p-3.5 rounded-xl font-bold text-sm transition flex justify-between items-center ${
                selectedFertilizer === f.id
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100/70 border border-slate-100'
              }`}
            >
              <span>{f.name}</span>
              <span className={`text-[9px] uppercase px-2 py-0.5 rounded-full font-black ${
                selectedFertilizer === f.id
                  ? 'bg-emerald-500 text-white'
                  : f.category === 'Chemical'
                    ? 'bg-teal-50 text-teal-700 border border-teal-100'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
              }`}>
                {f.category}
              </span>
            </button>
          ))}
        </div>

        {/* Right Info Details */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-50 pb-3">
            <h4 className="text-lg font-black text-slate-800">{active.name} Advisory</h4>
            <span className={`px-3 py-1 text-xs font-bold rounded-full ${
              active.category === 'Chemical' 
                ? 'bg-teal-50 text-teal-700 border border-teal-100' 
                : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
            }`}>
              {active.category} Category
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Advantages and Disadvantages */}
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest block mb-2 flex items-center gap-1">
                  <BadgeCheck size={14} /> {t.adv}
                </span>
                <ul className="space-y-2">
                  {active.advantages.map((adv, idx) => (
                    <li key={idx} className="flex gap-2 text-xs font-medium text-slate-600 leading-relaxed">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>{adv}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="text-xs font-bold text-rose-600 uppercase tracking-widest block mb-2 flex items-center gap-1">
                  <XOctagon size={14} /> {t.disadv}
                </span>
                <ul className="space-y-2">
                  {active.disadvantages.map((dis, idx) => (
                    <li key={idx} className="flex gap-2 text-xs font-medium text-slate-600 leading-relaxed">
                      <span className="text-rose-500 font-bold">•</span>
                      <span>{dis}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Dosage & Application */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  {t.dosage}
                </span>
                <p className="text-xs text-slate-700 font-bold leading-relaxed">{active.dosage}</p>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  {t.appMethod}
                </span>
                <p className="text-xs text-slate-700 font-semibold leading-relaxed">{active.applicationMethod}</p>
              </div>

              {active.category === 'Chemical' && (
                <div className="bg-amber-50 border border-amber-100 p-3.5 rounded-xl flex items-start gap-2.5">
                  <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-800 font-semibold leading-normal">
                    Do not apply chemical fertilizers during heavy rainfall as it causes leaching and eutrophication of nearby water bodies.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Safety & Organic Alternatives */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-slate-100 pt-5">
            <div>
              <span className="text-xs font-bold text-rose-700 uppercase tracking-widest block mb-3 flex items-center gap-1">
                <ShieldAlert size={14} /> Safety Measures
              </span>
              <ul className="space-y-2">
                {active.safetyPrecautions.map((safe, idx) => (
                  <li key={idx} className="flex gap-2 text-xs font-medium text-rose-800 leading-relaxed">
                    <span className="text-rose-500">⚠️</span>
                    <span>{safe}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest block mb-3 flex items-center gap-1">
                <Heart size={14} className="fill-emerald-100 text-emerald-600" /> {t.organicAlternative}
              </span>
              <ul className="space-y-2">
                {active.organicAlternatives.map((org, idx) => (
                  <li key={idx} className="flex gap-2 text-xs font-semibold text-emerald-800 leading-relaxed">
                    <span className="text-emerald-500">🌿</span>
                    <span>{org}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
