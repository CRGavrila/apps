// Copyright 2017-2019 @polkadot/app-accounts authors & contributors
// This software may be modified and distributed under the terms
// of the Apache-2.0 license. See the LICENSE file for details.

import { I18nProps } from '@polkadot/ui-app/types';
import { KeypairType } from '@polkadot/util-crypto/types';
import { Generator$Matches, Generator$Result } from '../vanitygen/types';
import { ComponentProps } from '../types';

import './index.css';

import React from 'react';
import { Button, Dropdown, Input } from '@polkadot/ui-app';
import uiSettings from '@polkadot/ui-settings';

import generator from '../vanitygen';
import matchRegex from '../vanitygen/regex';
import generatorSort from '../vanitygen/sort';
import Match from './Match';
import translate from './translate';

type Props = ComponentProps & I18nProps;

type State = {
  elapsed: number,
  isMatchValid: boolean,
  isRunning: boolean,
  keyCount: 0,
  keyTime: 0,
  match: string,
  matches: Generator$Matches,
  startAt: number,
  type: KeypairType,
  withCase: boolean
};

const DEFAULT_MATCH = 'Some';
const BOOL_OPTIONS = [
  { text: 'No', value: false },
  { text: 'Yes', value: true }
];

class VanityApp extends React.PureComponent<Props, State> {
  results: Array<Generator$Result> = [];
  state: State = {
    elapsed: 0,
    isMatchValid: true,
    isRunning: false,
    keyCount: 0,
    keyTime: 0,
    match: DEFAULT_MATCH,
    matches: [],
    startAt: 0,
    type: 'ed25519',
    withCase: true
  };

  private _isActive: boolean = false;

  componentWillUnmount () {
    this._isActive = false;
  }

  render () {
    return (
      <div className='accounts--Vanity'>
        {this.renderOptions()}
        {this.renderButtons()}
        {this.renderStats()}
        {this.renderMatches()}
      </div>
    );
  }

  renderButtons () {
    const { t } = this.props;
    const { isMatchValid, isRunning } = this.state;

    return (
      <Button.Group>
        <Button
          isDisabled={!isMatchValid}
          isPrimary={!isRunning}
          onClick={this.toggleStart}
          label={
            isRunning
              ? t('Stop generation')
              : t('Start generation')
          }
        />
      </Button.Group>
    );
  }

  renderMatches () {
    const { matches } = this.state;

    return (
      <div className='vanity--App-matches'>
        {matches.map((match) => (
          <Match
            {...match}
            key={match.address}
            onCreateToggle={this.onCreateToggle}
            onRemove={this.onRemove}
          />
        ))}
      </div>
    );
  }

  renderOptions () {
    const { t } = this.props;
    const { isMatchValid, isRunning, match, type, withCase } = this.state;

    return (
      <>
        <div className='ui--row'>
          <Input
            autoFocus
            className='medium'
            help={t('Type here what you would like your address to contain. This tool will generate the keys and show the associated addresses that best match your search. You can use "?" as a wildcard for a character.')}
            isDisabled={isRunning}
            isError={!isMatchValid}
            label={t('Search for')}
            onChange={this.onChangeMatch}
            value={match}
          />
          <Dropdown
            className='medium'
            help={t('Should the search be case sensitive, e.g if you select "no" your search for "Some" may return addresses containing "somE" or "sOme"...')}
            isDisabled={isRunning}
            label={t('case sensitive')}
            options={BOOL_OPTIONS}
            onChange={this.onChangeCase}
            value={withCase}
          />
        </div>
        <div className='ui--row'>
          <Dropdown
            className='medium'
            defaultValue={type}
            help={t('Determines what cryptography will be used to create this account. Note that to validate on Polkadot, the session account must use "ed25519".')}
            label={t('keypair crypto type')}
            onChange={this.onChangeType}
            options={uiSettings.availableCryptos}
          />
        </div>
      </>
    );
  }

  renderStats () {
    const { t } = this.props;
    const { elapsed, keyCount } = this.state;

    if (!keyCount) {
      return null;
    }

    const secs = elapsed / 1000;

    return (
      <div className='vanity--App-stats'>
        {t('Evaluated {{count}} keys in {{elapsed}}s ({{avg}} keys/s)', {
          replace: {
            avg: (keyCount / secs).toFixed(3),
            count: keyCount,
            elapsed: secs.toFixed(2)
          }
        })}
      </div>
    );
  }

  checkMatches (): void {
    const results = this.results;

    this.results = [];

    if (results.length === 0 || !this._isActive) {
      return;
    }

    this.setState(
      (prevState: State) => {
        let newKeyCount = prevState.keyCount;
        let newKeyTime = prevState.keyTime;

        const matches = results
          .reduce((result, { elapsed, found }) => {
            newKeyCount += found.length;
            newKeyTime += elapsed;

            return result.concat(found);
          }, prevState.matches)
          .sort(generatorSort)
          .slice(0, 25);
        const elapsed = Date.now() - prevState.startAt;

        return {
          elapsed,
          matches,
          keyCount: newKeyCount,
          keyTime: newKeyTime
        };
      }
    );
  }

  executeGeneration = (): void => {
    if (!this.state.isRunning) {
      this.checkMatches();

      return;
    }

    setTimeout(() => {
      if (this._isActive) {
        if (this.results.length === 25) {
          this.checkMatches();
        }

        const { match, type, withCase } = this.state;

        this.results.push(
          generator({
            match,
            runs: 10,
            type,
            withCase
          })
        );

        this.executeGeneration();
      }
    }, 0);
  }

  private onCreateToggle = (seed: string) => {
    const { basePath } = this.props;
    const { type } = this.state;

    window.location.hash = `${basePath}/create/${type}/${seed}`;
  }

  onChangeCase = (withCase: boolean): void => {
    this.setState({ withCase });
  }

  onChangeMatch = (match: string): void => {
    this.setState({
      isMatchValid:
        matchRegex.test(match) &&
        (match.length !== 0) &&
        (match.length < 31),
      match
    });
  }

  onChangeType = (type: KeypairType): void => {
    this.setState({ type } as State);
  }

  onRemove = (address: string): void => {
    this.setState(
      (prevState: State) => ({
        matches: prevState.matches.filter((item) =>
          item.address !== address
        )
      })
    );
  }

  toggleStart = (): void => {
    this.setState(
      (prevState: State) => {
        const { isRunning, keyCount, keyTime, startAt } = prevState;

        this._isActive = !isRunning;

        return {
          isRunning: this._isActive,
          keyCount: this._isActive ? 0 : keyCount,
          keyTime: this._isActive ? 0 : keyTime,
          startAt: this._isActive ? Date.now() : startAt
        };
      },
      this.executeGeneration
    );
  }
}

export default translate(VanityApp);
