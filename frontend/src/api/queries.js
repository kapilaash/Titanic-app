import apiClient from './client';

export const fetchDatasetInfo = async () => {
  const response = await apiClient.get('/info');
  return response.data;
};

export const fetchSummary = async () => {
  const response = await apiClient.get('/summary');
  return response.data;
};

export const fetchSurvivalRates = async () => {
  const response = await apiClient.get('/survival_rates');
  return response.data;
};

export const fetchCorrelation = async () => {
  const response = await apiClient.get('/correlation');
  return response.data;
};

export const fetchRegressionSurvival = async () => {
  const response = await apiClient.get('/regression/survival');
  return response.data;
};

export const fetchRegressionFeatureAnalysis = async () => {
  const response = await apiClient.get('/regression/feature_analysis');
  return response.data;
};

export const fetchPassengerData = async ({
  page,
  perPage,
  search,
  sortBy,
  sortDir,
}) => {
  const response = await apiClient.get('/data', {
    params: {
      page,
      per_page: perPage,
      search,
      sort_by: sortBy,
      sort_dir: sortDir,
    },
  });

  return response.data;
};
