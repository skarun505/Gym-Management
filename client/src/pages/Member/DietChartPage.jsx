import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import { Apple, Droplets, Flame, Lock, ChevronDown, ChevronUp, Zap } from 'lucide-react';

// ─── Diet plans per goal ──────────────────────────────────────
const DIET_PLANS = {
  'Weight Loss': {
    tagline: 'Calorie Deficit · High Protein · Clean Carbs',
    color: 'from-emerald-500 to-teal-600',
    calories: 1800,
    macros: { protein: 150, carbs: 150, fat: 50, water: 10 },
    meals: [
      { time: '7:00 AM', label: 'Breakfast', icon: '🌅', items: ['3 egg whites + 1 whole egg scrambled', '1 slice multigrain toast', '1 cup black coffee / green tea', 'Handful of mixed berries'] },
      { time: '10:30 AM', label: 'Mid-Morning', icon: '🍎', items: ['1 medium apple or pear', '10–12 almonds', 'Water with lemon'] },
      { time: '1:00 PM', label: 'Lunch', icon: '🥗', items: ['150g grilled chicken breast / paneer (veg)', '1 cup brown rice or 2 rotis', 'Large cucumber + tomato salad', '1 cup dal (if veg)'] },
      { time: '4:30 PM', label: 'Pre-Workout Snack', icon: '⚡', items: ['1 banana or sweet potato', '1 scoop whey protein (if available)', 'Black coffee (energy boost)'] },
      { time: '7:30 PM', label: 'Post-Workout Dinner', icon: '🍽️', items: ['150g fish / chicken / tofu', 'Steamed broccoli + carrot', '1 cup green vegetable soup', 'Avoid heavy carbs post 7 PM'] },
      { time: '9:30 PM', label: 'Night Snack', icon: '🌙', items: ['1 cup warm skimmed milk', '5 walnuts', 'Avoid sugar and processed food'] },
    ],
    tips: ['Drink 10–12 glasses of water daily', 'Eat slowly — it takes 20 min to feel full', 'Avoid packaged juices and sodas', 'Add 30 min of cardio on workout days', 'Track portions — 150g protein = palm size'],
  },
  'Muscle Gain': {
    tagline: 'Calorie Surplus · High Protein · Complex Carbs',
    color: 'from-primary-500 to-blue-600',
    calories: 2800,
    macros: { protein: 180, carbs: 320, fat: 80, water: 12 },
    meals: [
      { time: '7:00 AM', label: 'Breakfast', icon: '🌅', items: ['4 whole eggs scrambled', '2 slices multigrain toast with peanut butter', '1 glass full-fat milk', '1 banana'] },
      { time: '10:00 AM', label: 'Mid-Morning', icon: '💪', items: ['1 scoop whey protein with milk', 'Handful mixed nuts (almonds, cashews)', '2 rice cakes'] },
      { time: '1:00 PM', label: 'Lunch', icon: '🍽️', items: ['200g chicken breast / fish / paneer', '2 cups cooked rice or 3–4 rotis', '1 cup dal', 'Salad + curd (dahi)'] },
      { time: '4:00 PM', label: 'Pre-Workout', icon: '⚡', items: ['2 bananas or sweet potato', '1 scoop pre-workout / black coffee', '1 handful of dates for quick energy'] },
      { time: '7:30 PM', label: 'Post-Workout', icon: '🏋️', items: ['1–2 scoops whey protein with milk (within 30 min)', '200g rice or 3 rotis', '150g chicken / paneer / eggs', 'This is your most important meal'] },
      { time: '10:00 PM', label: 'Night Meal', icon: '🌙', items: ['200g cottage cheese / paneer (slow protein)', '1 cup milk', 'Avoid high-sugar items'] },
    ],
    tips: ['Eat every 3–4 hours to keep muscles fed', 'Post-workout nutrition within 30 min is crucial', 'Sleep 8 hours — muscles grow during sleep', 'Progressive overload: add weight each week', 'Creatine monohydrate is safe and effective'],
  },
  'General Fitness': {
    tagline: 'Balanced Macros · Clean Eating · Sustainable',
    color: 'from-amber-500 to-orange-600',
    calories: 2200,
    macros: { protein: 120, carbs: 250, fat: 65, water: 8 },
    meals: [
      { time: '7:00 AM', label: 'Breakfast', icon: '🌅', items: ['2–3 eggs (any style)', '1–2 slices whole wheat toast', '1 cup tea or coffee (no sugar)', '1 fruit of choice'] },
      { time: '10:30 AM', label: 'Mid-Morning', icon: '🍌', items: ['1 fruit (banana, apple, or orange)', 'Handful of mixed nuts', 'Plenty of water'] },
      { time: '1:00 PM', label: 'Lunch', icon: '🍽️', items: ['1 cup dal or legumes', '2–3 rotis or 1 cup rice', '150g protein source (chicken/paneer/fish)', 'Seasonal vegetable sabzi', 'Salad'] },
      { time: '4:30 PM', label: 'Evening Snack', icon: '🫐', items: ['Sprouts salad or fruit chat', 'Buttermilk / curd', 'Avoid fried snacks'] },
      { time: '7:30 PM', label: 'Dinner', icon: '🥘', items: ['Lighter than lunch', '2 rotis + sabzi', '1 bowl dal', 'Avoid heavy carbs after 8 PM'] },
      { time: '9:30 PM', label: 'Optional', icon: '🌙', items: ['1 glass warm milk', 'No heavy snacking at night'] },
    ],
    tips: ['Stay consistent — results take 8–12 weeks', 'Home-cooked food is always better', 'Limit eating out to 2 times per week', 'Sugary drinks are hidden calorie bombs', 'Combine with 3–5 workouts per week'],
  },
};

function MacroBar({ label, value, max, color }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400 font-medium">{label}</span>
        <span className="text-white font-bold">{value}g</span>
      </div>
      <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MealCard({ meal }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card overflow-hidden">
      <button
        className="w-full flex items-center gap-3 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-2xl">{meal.icon}</span>
        <div className="flex-1">
          <p className="text-white font-semibold text-sm">{meal.label}</p>
          <p className="text-gray-500 text-xs">{meal.time}</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>
      {open && (
        <ul className="mt-3 pt-3 border-t border-white/5 space-y-1.5">
          {meal.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-400 flex-shrink-0 mt-1.5" />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function DietChartPage() {
  const { user } = useAuthStore();
  const [member, setMember]   = useState(null);
  const [streak, setStreak]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      const { data: m } = await supabase.from('members').select('*').eq('profile_id', user.id).maybeSingle();
      const { data: s } = await supabase.from('member_streaks').select('*').eq('member_id', m?.id).maybeSingle();
      setMember(m);
      setStreak(s);
      setLoading(false);
    };
    load();
  }, [user?.id]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary-600/30 border-t-primary-500 rounded-full animate-spin" />
    </div>
  );

  const unlocked = (streak?.diet_unlocked || streak?.current_streak >= 7 || streak?.longest_streak >= 7);
  const goal     = member?.fitness_goal || 'General Fitness';
  const plan     = DIET_PLANS[goal] || DIET_PLANS['General Fitness'];

  if (!unlocked) {
    const needed = 7 - (streak?.current_streak || 0);
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center gap-6">
        <div className="w-20 h-20 rounded-3xl bg-dark-700 border border-white/10 flex items-center justify-center">
          <Lock className="w-10 h-10 text-gray-600" />
        </div>
        <div>
          <h2 className="text-white font-black text-xl">Diet Chart Locked 🔒</h2>
          <p className="text-gray-400 text-sm mt-2 max-w-xs">
            Earn your <span className="text-orange-400 font-bold">7-Day Streak</span> badge to unlock your personalized diet chart!
          </p>
        </div>
        <div className="bg-dark-800 border border-white/10 rounded-2xl p-5 w-full max-w-xs">
          <p className="text-gray-500 text-xs uppercase tracking-wider font-semibold mb-3">Your Progress</p>
          <div className="flex items-center gap-3">
            <Flame className="w-8 h-8 text-orange-400" />
            <div className="flex-1">
              <div className="h-3 bg-dark-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-primary-500 rounded-full transition-all"
                  style={{ width: `${Math.min(((streak?.current_streak || 0) / 7) * 100, 100)}%` }}
                />
              </div>
              <p className="text-orange-400 text-sm font-bold mt-1">{streak?.current_streak || 0} / 7 days</p>
            </div>
          </div>
          <p className="text-gray-500 text-xs mt-3">
            {needed <= 0 ? 'Almost there!' : `Check in ${needed} more day${needed !== 1 ? 's' : ''} in a row to unlock`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className={`mx-4 mt-4 rounded-3xl p-5 bg-gradient-to-br ${plan.color} relative overflow-hidden`}>
        <div className="absolute -right-6 -top-6 w-28 h-28 bg-white/10 rounded-full" />
        <div className="absolute -right-2 -bottom-8 w-20 h-20 bg-white/5 rounded-full" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Apple className="w-5 h-5 text-white" />
            <p className="text-white/80 text-xs font-semibold uppercase tracking-wider">Your Diet Plan</p>
          </div>
          <h1 className="text-white font-black text-2xl">{goal}</h1>
          <p className="text-white/70 text-sm mt-0.5">{plan.tagline}</p>
          <div className="mt-3 flex items-center gap-2">
            <Flame className="w-4 h-4 text-white/80" />
            <span className="text-white font-bold">{plan.calories} kcal/day</span>
            <span className="text-white/60 text-xs">target</span>
          </div>
        </div>
      </div>

      {/* Macros */}
      <div className="mx-4 card space-y-4">
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Daily Macros Target</p>
        <MacroBar label="Protein"        value={plan.macros.protein} max={250} color="bg-primary-500" />
        <MacroBar label="Carbohydrates"  value={plan.macros.carbs}   max={400} color="bg-amber-500" />
        <MacroBar label="Healthy Fats"   value={plan.macros.fat}     max={120} color="bg-emerald-500" />
        <div className="flex items-center gap-2 pt-1 border-t border-white/5">
          <Droplets className="w-4 h-4 text-blue-400" />
          <span className="text-gray-300 text-sm">Water: <span className="text-blue-400 font-bold">{plan.macros.water} glasses/day</span></span>
        </div>
      </div>

      {/* Meal Plan */}
      <div className="px-4">
        <p className="text-white font-bold mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary-400" /> Meal Plan
        </p>
        <div className="space-y-3">
          {plan.meals.map((meal, i) => <MealCard key={i} meal={meal} />)}
        </div>
      </div>

      {/* Tips */}
      <div className="mx-4 card">
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">💡 Pro Tips</p>
        <ul className="space-y-2">
          {plan.tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0 mt-1.5" />
              {tip}
            </li>
          ))}
        </ul>
        <p className="text-gray-600 text-xs mt-4 text-center">
          This plan refreshes every 30 days · Consult a nutritionist for medical conditions
        </p>
      </div>
    </div>
  );
}
