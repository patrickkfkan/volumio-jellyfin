export interface Filter {
  type: string,
  title?: string,
  placeholder: string,
  field?: string,
  icon?: string,
  resettable?: boolean,
  options?: FilterOption[],
  subfilters?: Filter[]
}

export interface FilterOption {
  name: string,
  value: any,
  selected?: boolean
}

export type FilterSelection = Record<string, FilterOption['value']>;

interface FilterModel {
  getFilter(config?: any): Promise<Filter>;
  getDefaultSelection(params: any): Promise<FilterSelection>;
}

export default FilterModel;
