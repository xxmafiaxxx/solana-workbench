import { useState } from 'react';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Popover from 'react-bootstrap/Popover';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { Row, Col } from 'react-bootstrap';
import { toast } from 'react-toastify';

import * as web3 from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

import { sendSolFromSelectedWallet } from '../data/accounts/account';

// TODO: rename to SendSol (from selected wallet/account)
function TransferSolPopover(props: { pubKey: string | undefined }) {
  const { pubKey } = props;
  const { connection } = useConnection();
  const selectedWallet = useWallet();

  let pubKeyVal = pubKey;
  if (!pubKeyVal) {
    pubKeyVal = 'paste';
  }

  const [sol, setSol] = useState<string>('0.01');
  const [toKey, setToKey] = useState<string>('');

  return (
    <Popover id="popover-basic">
      <Popover.Header as="h3">Send SOL</Popover.Header>
      <Popover.Body>
        <Form>
          <Form.Group as={Row} className="mb-3" controlId="formSOLAmount">
            <Form.Label column sm={3}>
              SOL
            </Form.Label>
            <Col sm={9}>
              <Form.Control
                type="number"
                placeholder="Select amount of SOL to transfer"
                value={sol}
                onChange={(e) => setSol(e.target.value)}
              />
              {/* TODO: check to see if the from Account has enough, including TX costs if its to come from them */}
              {/* TODO: add a MAX button */}
              <Form.Text className="text-muted" />
            </Col>
          </Form.Group>

          <Form.Group as={Row} className="mb-3" controlId="formFromAccount">
            {/* TODO: these can only be accounts we know the private key for ... */}
            {/* TODO: should be able to edit, paste and select from list populated from accountList */}
            <Form.Label column sm={3}>
              From
            </Form.Label>
            <Col sm={9}>
              <Form.Control
                type="disabled"
                placeholder="SOL comes from SelectedWallet"
                value={selectedWallet.publicKey?.toString()}
                // onChange={(e) => setFromKey(e.target.value)}
              />
              <Form.Text className="text-muted" />
            </Col>
          </Form.Group>

          <Form.Group as={Row} className="mb-3" controlId="formToAccount">
            <Form.Label column sm={3}>
              To
            </Form.Label>
            <Col sm={9}>
              <Form.Control
                type="text"
                placeholder="Select Account to send the SOL to"
                value={toKey}
                onChange={(e) => setToKey(e.target.value)}
              />
              <Form.Text className="text-muted">
                {/* TODO: add radio selector to choose where the TX cost comes from */}
                Transaction cost from To account (after transfer takes place)
              </Form.Text>
            </Col>
          </Form.Group>

          <Form.Group as={Row} className="mb-3" controlId="formBasicCheckbox">
            <Col sm={{ span: 10, offset: 2 }}>
              <Form.Check type="checkbox" label="Check me out" />
            </Col>
          </Form.Group>

          <Form.Group as={Row} className="mb-3">
            <Col sm={{ span: 10, offset: 2 }}>
              <Button
                type="button"
                onClick={() => {
                  document.body.click();
                  // const fromPk = new web3.PublicKey(fromKey);
                  const toPk = new web3.PublicKey(toKey);

                  toast.promise(
                    sendSolFromSelectedWallet(
                      connection,
                      selectedWallet,
                      toPk,
                      sol
                    ),
                    {
                      pending: 'Transfer submitted',
                      success: 'Transfer succeeded 👌',
                      // error: 'Transfer failed 🤯',
                      error: {
                        render({ data }) {
                          // eslint-disable-next-line no-console
                          console.log('eror', data);
                          // When the promise reject, data will contains the error
                          return 'error';
                        },
                      },
                    }
                  );
                }}
              >
                Submit Transfer
              </Button>
            </Col>
          </Form.Group>
        </Form>
      </Popover.Body>
    </Popover>
  );
}

function TransferSolButton(props: { pubKey: string | undefined }) {
  const { pubKey } = props;

  return (
    <OverlayTrigger
      trigger="click"
      placement="bottom"
      overlay={TransferSolPopover({ pubKey })}
      rootClose
    >
      <Button variant="success">Send SOL</Button>
    </OverlayTrigger>
  );
}

export default TransferSolButton;
