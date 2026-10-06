import type { BaseIssue } from './issue.ts';

/**
 * Unknown dataset interface.
 */
export interface UnknownDataset {
  /**
   * Whether it's typed.
   */
  typed?: false;
  /**
   * The dataset value.
   */
  value: unknown;
  /**
   * The dataset issues.
   */
  issues?: undefined;
  /**
   * Whether the dataset is incomplete because the validation was aborted
   * early before all nested values were checked.
   */
  incomplete?: undefined;
}

/**
 * Success dataset interface.
 */
export interface SuccessDataset<TValue> {
  /**
   * Whether it's typed.
   */
  typed: true;
  /**
   * The dataset value.
   */
  value: TValue;
  /**
   * The dataset issues.
   */
  issues?: undefined;
  /**
   * Whether the dataset is incomplete because the validation was aborted
   * early before all nested values were checked.
   */
  incomplete?: undefined;
}

/**
 * Partial dataset interface.
 */
export interface PartialDataset<TValue, TIssue extends BaseIssue<unknown>> {
  /**
   * Whether it's typed.
   */
  typed: true;
  /**
   * The dataset value.
   */
  value: TValue;
  /**
   * The dataset issues.
   */
  issues: [TIssue, ...TIssue[]];
  /**
   * Whether the dataset is incomplete because the validation was aborted
   * early before all nested values were checked.
   */
  incomplete?: boolean | undefined;
}

/**
 * Failure dataset interface.
 */
export interface FailureDataset<TIssue extends BaseIssue<unknown>> {
  /**
   * Whether it's typed.
   */
  typed: false;
  /**
   * The dataset value.
   */
  value: unknown;
  /**
   * The dataset issues.
   */
  issues: [TIssue, ...TIssue[]];
  /**
   * Whether the dataset is incomplete because the validation was aborted
   * early before all nested values were checked.
   */
  incomplete?: boolean | undefined;
}

/**
 * Output dataset type.
 */
export type OutputDataset<TValue, TIssue extends BaseIssue<unknown>> =
  | SuccessDataset<TValue>
  | PartialDataset<TValue, TIssue>
  | FailureDataset<TIssue>;
