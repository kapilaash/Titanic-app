// components/RegressionAnalysis.js
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  fetchRegressionSurvival,
  fetchRegressionFeatureAnalysis,
} from '../api/queries';
import { markExplorationTask } from '../utils/explorationProgress';

const chartColors = ['#22d3ee', '#a78bfa', '#34d399', '#fbbf24', '#fb7185', '#60a5fa', '#818cf8', '#2dd4bf'];

const formatPercent = (value, fallback = '—') => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return `${(numeric * 100).toFixed(1)}%`;
};

const formatPercentPoint = (value, fallback = '—') => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return `${numeric.toFixed(1)} pts`;
};

const formatDecimal = (value, fallback = '—') => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return numeric.toFixed(3);
};

const MetricPanel = ({ label, value, helper, tone = 'cyan' }) => {
  const toneMap = {
    cyan: 'text-cyan-100 border-cyan-200/15 bg-cyan-300/10',
    violet: 'text-violet-100 border-violet-200/15 bg-violet-300/10',
    emerald: 'text-emerald-100 border-emerald-200/15 bg-emerald-300/10',
    amber: 'text-amber-100 border-amber-200/15 bg-amber-300/10',
  };

  return (
    <div className={`rounded-[1.5rem] border p-5 ${toneMap[tone]}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">{label}</div>
      <div className="mt-2 text-3xl font-black tracking-[-0.05em] text-white">{value}</div>
      <p className="mt-2 text-xs leading-relaxed text-slate-400">{helper}</p>
    </div>
  );
};

const normalizeFeatureAnalysis = (featureAnalysis) => {
  if (!featureAnalysis || typeof featureAnalysis !== 'object') {
    return { categorical: [], continuous: [], insights: [] };
  }

  if (Array.isArray(featureAnalysis.categorical) || Array.isArray(featureAnalysis.continuous)) {
    return {
      categorical: Array.isArray(featureAnalysis.categorical) ? featureAnalysis.categorical : [],
      continuous: Array.isArray(featureAnalysis.continuous) ? featureAnalysis.continuous : [],
      insights: Array.isArray(featureAnalysis.insights) ? featureAnalysis.insights : [],
      summary: featureAnalysis.summary || {},
    };
  }

  const categorical = [];
  const continuous = [];
  Object.entries(featureAnalysis).forEach(([feature, value]) => {
    if (!value || typeof value !== 'object') return;
    if (value.survival_by_group) {
      const groups = Object.entries(value.survival_by_group).map(([group, survivalRate]) => ({
        group: String(group),
        survival_rate: Number(survivalRate),
        count: null,
      }));
      const best = groups.length ? [...groups].sort((a, b) => b.survival_rate - a.survival_rate)[0] : null;
      const worst = groups.length ? [...groups].sort((a, b) => a.survival_rate - b.survival_rate)[0] : null;
      categorical.push({
        feature,
        feature_type: value.feature_type || 'categorical_or_discrete',
        groups,
        best_group: best,
        lowest_group: worst,
        spread: best && worst ? best.survival_rate - worst.survival_rate : 0,
      });
    } else if (value.correlation_with_survival !== undefined) {
      continuous.push({
        feature,
        feature_type: value.feature_type || 'continuous',
        correlation_with_survival: Number(value.correlation_with_survival),
      });
    }
  });

  return { categorical, continuous, insights: [] };
};

const RegressionAnalysis = () => {
  const [activeTab, setActiveTab] = useState('performance');

  const {
    data: regressionData,
    isLoading: isRegressionLoading,
    isError: isRegressionError,
    error: regressionError,
  } = useQuery({
    queryKey: ['regression', 'survival'],
    queryFn: fetchRegressionSurvival,
    staleTime: 1000 * 60 * 10,
  });

  const {
    data: featureAnalysis,
    isLoading: isFeatureAnalysisLoading,
    isError: isFeatureAnalysisError,
    error: featureAnalysisError,
  } = useQuery({
    queryKey: ['regression', 'feature-analysis'],
    queryFn: fetchRegressionFeatureAnalysis,
    staleTime: 1000 * 60 * 10,
  });

  const isLoading = isRegressionLoading || isFeatureAnalysisLoading;
  const isError = isRegressionError || isFeatureAnalysisError;
  const modelPerformance = regressionData?.model_performance || {};
  const crossValidation = regressionData?.cross_validation || {};
  const cvScores = Array.isArray(modelPerformance.cv_scores)
    ? modelPerformance.cv_scores
    : Array.isArray(crossValidation.scores)
      ? crossValidation.scores
      : [];

  const featureImportance = regressionData?.feature_importance || {};
  const samplePredictions = Array.isArray(regressionData?.sample_predictions)
    ? regressionData.sample_predictions
    : [];
  const normalizedAnalysis = useMemo(() => normalizeFeatureAnalysis(featureAnalysis), [featureAnalysis]);

  const featureImportanceData = useMemo(() => Object.entries(featureImportance || {})
    .map(([feature, importance], index) => {
      const numericImportance = Number(importance);
      return {
        feature,
        shortFeature: feature.length > 14 ? `${feature.slice(0, 12)}…` : feature,
        importance: Math.abs(Number.isFinite(numericImportance) ? numericImportance : 0),
        rawImportance: Number.isFinite(numericImportance) ? numericImportance : 0,
        color: chartColors[index % chartColors.length],
      };
    })
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 10), [featureImportance]);

  const strongestCategorical = useMemo(() => {
    if (!normalizedAnalysis.categorical.length) return null;
    return [...normalizedAnalysis.categorical].sort((a, b) => Number(b.spread || 0) - Number(a.spread || 0))[0];
  }, [normalizedAnalysis.categorical]);

  const strongestContinuous = useMemo(() => {
    if (!normalizedAnalysis.continuous.length) return null;
    return [...normalizedAnalysis.continuous].sort((a, b) => Math.abs(Number(b.correlation_with_survival || 0)) - Math.abs(Number(a.correlation_with_survival || 0)))[0];
  }, [normalizedAnalysis.continuous]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'predictions') markExplorationTask('predictionChecked');
    if (tabId === 'features' || tabId === 'diagnostics') markExplorationTask('mlExplored');
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-2xl border border-white/10 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-xl">
          <p className="font-black text-white">{label}</p>
          <p className="mt-1 text-sm text-slate-400">
            Importance: <span className="font-black text-cyan-100">{Number(payload[0].value || 0).toFixed(4)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[30rem] items-center justify-center">
        <div className="h-12 w-12 rounded-full border-2 border-violet-200 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-rose-300/20 bg-rose-500/10 p-6 text-rose-100">
        <h3 className="font-black">Unable to load machine learning insights</h3>
        <p className="mt-2 text-sm text-rose-100/80">
          {regressionError?.message || featureAnalysisError?.message || 'Please check the backend connection.'}
        </p>
      </div>
    );
  }

  if (!regressionData) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-8 text-center text-slate-400">
        No machine learning insight data was returned by the backend.
      </div>
    );
  }

  const tabs = [
    { id: 'performance', label: 'Performance', icon: '◎' },
    { id: 'features', label: 'Feature Impact', icon: '✦' },
    { id: 'predictions', label: 'Predictions', icon: '◉' },
    { id: 'diagnostics', label: 'Signal Diagnostics', icon: '⌬' },
  ];

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-[1.5rem] p-2">
        <div className="grid gap-2 sm:grid-cols-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`rounded-2xl px-4 py-3 text-sm font-black transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-white text-slate-950 shadow-[0_18px_45px_rgba(255,255,255,0.10)]'
                  : 'text-slate-400 hover:bg-white/[0.07] hover:text-white'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>{tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'performance' && (
        <div className="space-y-6 animate-slide-up">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricPanel label="Accuracy" value={formatPercent(modelPerformance.accuracy)} helper="Backend-reported test accuracy." tone="cyan" />
            <MetricPanel label="Precision" value={formatPercent(modelPerformance.precision)} helper="Positive survival prediction precision." tone="violet" />
            <MetricPanel label="Recall" value={formatPercent(modelPerformance.recall)} helper="Recovered survival cases." tone="emerald" />
            <MetricPanel label="F1 Score" value={formatPercent(modelPerformance.f1_score)} helper="Balanced precision and recall." tone="amber" />
          </div>

          <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-6">
              <p className="kicker text-violet-200">Model Contract</p>
              <h3 className="mt-3 text-3xl font-black tracking-[-0.05em] text-white">Random Forest survival predictor</h3>
              <p className="mt-4 text-sm leading-relaxed text-slate-400">
                This page reads model quality from the backend. No frontend constants are used for accuracy, cross-validation, sample predictions, or feature importance.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">Train rows</div>
                  <div className="mt-1 text-xl font-black text-white">{modelPerformance.training_samples || '—'}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">Test rows</div>
                  <div className="mt-1 text-xl font-black text-white">{modelPerformance.testing_samples || '—'}</div>
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-6">
              <p className="kicker text-cyan-200">Cross Validation</p>
              {cvScores.length > 0 ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-5">
                  {cvScores.map((score, index) => (
                    <div key={`${score}-${index}`} className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 text-center">
                      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Fold {index + 1}</div>
                      <div className="mt-2 text-xl font-black text-white">{formatPercent(score)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">Cross-validation scores were not included in the backend response.</p>
              )}
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <MetricPanel label="CV Mean" value={formatPercent(modelPerformance.cv_mean ?? crossValidation.mean)} helper="Average validation score." tone="cyan" />
                <MetricPanel label="Overfit Gap" value={formatPercentPoint(Number(modelPerformance.overfitting_gap || 0) * 100)} helper="Train accuracy minus test accuracy." tone="violet" />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'features' && (
        <div className="space-y-6 animate-slide-up">
          <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="h-[31rem] rounded-[1.75rem] border border-white/10 bg-slate-950/45 p-5">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={featureImportanceData} layout="vertical" margin={{ top: 10, right: 18, left: 26, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" />
                  <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: 'rgba(148,163,184,0.2)' }} tickLine={false} />
                  <YAxis dataKey="shortFeature" type="category" tick={{ fill: '#94a3b8', fontSize: 12 }} width={96} axisLine={{ stroke: 'rgba(148,163,184,0.2)' }} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="importance" radius={[0, 12, 12, 0]}>
                    {featureImportanceData.map((entry) => (
                      <Cell key={entry.feature} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-5">
              <p className="kicker text-cyan-200">Top Drivers</p>
              <div className="mt-5 space-y-3">
                {featureImportanceData.slice(0, 6).map((feature, index) => (
                  <div key={feature.feature} className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-black text-white">{index + 1}. {feature.feature}</div>
                        <div className="mt-1 text-xs text-slate-500">Importance {formatDecimal(feature.importance)}</div>
                      </div>
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: feature.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'predictions' && (
        <div className="space-y-4 animate-slide-up">
          {samplePredictions.length > 0 ? (
            samplePredictions.map((prediction, index) => {
              const passengerData = prediction.passenger || prediction.passenger_data || prediction;
              const probability = Number(prediction.survival_probability ?? prediction.probability ?? prediction.predicted_probability ?? 0);
              const predictedSurvival = Boolean(prediction.predicted_survival ?? prediction.prediction ?? probability >= 0.5);
              const actualSurvival = prediction.actual_survival ?? passengerData.Survived;
              const isCorrect = actualSurvival === undefined || actualSurvival === null
                ? null
                : Boolean(actualSurvival) === predictedSurvival || Number(actualSurvival) === Number(predictedSurvival);

              return (
                <div key={prediction.id || passengerData.PassengerId || index} className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-5">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-black tracking-[-0.04em] text-white">
                          {passengerData.Name || `Prediction ${index + 1}`}
                        </h3>
                        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                          predictedSurvival
                            ? 'border-emerald-200/25 bg-emerald-300/10 text-emerald-100'
                            : 'border-rose-200/25 bg-rose-300/10 text-rose-100'
                        }`}>
                          Predicted: {predictedSurvival ? 'Survived' : 'Perished'}
                        </span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                        {[
                          ['Class', passengerData.Pclass || 'N/A'],
                          ['Age', Number.isFinite(Number(passengerData.Age)) ? `${Math.round(Number(passengerData.Age))} yrs` : 'N/A'],
                          ['Sex', passengerData.Sex || 'N/A'],
                          ['Fare', Number.isFinite(Number(passengerData.Fare)) ? `$${Number(passengerData.Fare).toFixed(2)}` : 'N/A'],
                        ].map(([label, value]) => (
                          <div key={label} className="rounded-2xl border border-white/10 bg-slate-950/45 p-3">
                            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">{label}</div>
                            <div className="mt-1 font-black text-slate-200">{value}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/45 p-5 text-right lg:min-w-[12rem]">
                      <div className="text-4xl font-black tracking-[-0.06em] text-white">{Number.isFinite(probability) ? `${Math.round(probability * 100)}%` : '—'}</div>
                      <div className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">survival probability</div>
                      {isCorrect !== null && (
                        <div className={`mt-3 text-xs font-black ${isCorrect ? 'text-emerald-200' : 'text-rose-200'}`}>
                          {isCorrect ? 'Correct Prediction' : 'Incorrect Prediction'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-[1.75rem] border border-amber-300/20 bg-amber-300/10 p-6 text-amber-100">
              <h4 className="font-black">No sample predictions returned by backend</h4>
              <p className="mt-2 text-sm text-amber-100/80">
                The frontend is ready to render predictions, but `/regression/survival` does not currently include `sample_predictions`.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'diagnostics' && (
        <div className="space-y-6 animate-slide-up">
          <div className="grid gap-4 md:grid-cols-3">
            <MetricPanel
              label="Strongest Group Signal"
              value={strongestCategorical?.feature || '—'}
              helper={strongestCategorical ? `${formatPercentPoint(Number(strongestCategorical.spread || 0) * 100)} survival-rate spread.` : 'No categorical diagnostics.'}
              tone="cyan"
            />
            <MetricPanel
              label="Continuous Signal"
              value={strongestContinuous?.feature || '—'}
              helper={strongestContinuous ? `Correlation ${formatDecimal(strongestContinuous.correlation_with_survival)} with survival.` : 'No continuous diagnostics.'}
              tone="violet"
            />
            <MetricPanel
              label="Features Analyzed"
              value={normalizedAnalysis.summary?.features_analyzed || (normalizedAnalysis.categorical.length + normalizedAnalysis.continuous.length) || '—'}
              helper="Returned by the backend feature analysis endpoint."
              tone="emerald"
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-5">
              <p className="kicker text-cyan-200">Categorical Survival Signals</p>
              <div className="mt-5 space-y-4">
                {normalizedAnalysis.categorical.length > 0 ? normalizedAnalysis.categorical.map((feature) => (
                  <div key={feature.feature} className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-lg font-black text-white">{feature.feature}</div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">
                          Best group: {feature.best_group?.group || '—'} • Lowest group: {feature.lowest_group?.group || '—'}
                        </div>
                      </div>
                      <div className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-xs font-black text-cyan-100">
                        Spread {formatPercentPoint(Number(feature.spread || 0) * 100)}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {(feature.groups || []).slice(0, 6).map((group) => (
                        <div key={`${feature.feature}-${group.group}`} className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
                          <div className="truncate text-xs font-black uppercase tracking-[0.14em] text-slate-500">{group.group}</div>
                          <div className="mt-1 text-xl font-black text-white">{formatPercent(group.survival_rate)}</div>
                          {group.count !== null && <div className="mt-1 text-[10px] font-bold text-slate-600">{group.count} rows</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-slate-500">No categorical diagnostics were returned.</p>
                )}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-5">
              <p className="kicker text-violet-200">Continuous Feature Correlation</p>
              <div className="mt-5 space-y-3">
                {normalizedAnalysis.continuous.length > 0 ? normalizedAnalysis.continuous.map((feature) => (
                  <div key={feature.feature} className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-lg font-black text-white">{feature.feature}</div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">Correlation with survival</div>
                      </div>
                      <div className="text-2xl font-black text-white">{formatDecimal(feature.correlation_with_survival)}</div>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-300"
                        style={{ width: `${Math.min(100, Math.abs(Number(feature.correlation_with_survival || 0)) * 100)}%` }}
                      />
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-slate-500">No continuous diagnostics were returned.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegressionAnalysis;
