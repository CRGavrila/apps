// Copyright 2017-2019 @polkadot/app-democracy authors & contributors
// This software may be modified and distributed under the terms
// of the Apache-2.0 license. See the LICENSE file for details.

import { I18nProps } from '@polkadot/ui-app/types';
import { QueueTx$ExtrinsicAdd } from '@polkadot/ui-app/Status/types';
import { ApiProps } from '@polkadot/ui-api/types';

import BN from 'bn.js';
import React from 'react';
import { Button } from '@polkadot/ui-app';
import { withApi, withMulti } from '@polkadot/ui-api';

import translate from './translate';

type Props = ApiProps & I18nProps & {
  accountId?: string,
  queueExtrinsic: QueueTx$ExtrinsicAdd,
  propIndex: BN
};

class SecondingButton extends React.PureComponent<Props> {
  render () {
    const { accountId, t } = this.props;

    return (
      <Button.Group>
        <Button
          isDisabled={!accountId}
          isPositive
          label={t('Sponsor')}
          onClick={this.doSponsor}
        />
      </Button.Group>
    );
  }

  private doSponsor () {
    const { accountId, api, propIndex, queueExtrinsic } = this.props;

    if (!accountId) {
      return;
    }

    queueExtrinsic({
      extrinsic: api.tx.democracy.second(propIndex),
      accountId
    });
  }
}

export default withMulti(
  SecondingButton,
  translate,
  withApi
);
