import {
  faFilter,
  faSpinner,
  faSortDesc,
  faUnsorted,
} from '@fortawesome/free-solid-svg-icons';
import * as faRegular from '@fortawesome/free-regular-svg-icons';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useRef, useState } from 'react';
import { Dropdown, DropdownButton, Button } from 'react-bootstrap';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import ButtonToolbar from 'react-bootstrap/ButtonToolbar';
import Table from 'react-bootstrap/Table';
import { toast } from 'react-toastify';
import Popover from 'react-bootstrap/Popover';
import EdiText from 'react-editext';

import OutsideClickHandler from 'react-outside-click-handler';

import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import { Keypair } from '@solana/web3.js';
import {
  setSelected,
  accountsActions,
  selectAccountsListState,
} from 'renderer/data/SelectedAccountsList/selectedAccountsState';
import { useInterval, useAppSelector, useAppDispatch } from '../hooks';
import {
  selectValidatorNetworkState,
  NetStatus,
} from '../data/ValidatorNetwork/validatorNetworkState';
import {
  BASE58_PUBKEY_REGEX,
  GetTopAccounts,
} from '../data/accounts/getAccount';
import { AccountInfo } from '../data/accounts/accountInfo';

import { ProgramChange } from './ProgramChange';
import {
  unsubscribeProgramChanges,
  subscribeProgramChanges,
} from '../data/accounts/programChanges';
import createNewAccount from '../data/accounts/account';
import WatchAccountButton from './WatchAccountButton';

export const MAX_PROGRAM_CHANGES_DISPLAYED = 20;
export enum KnownProgramID {
  SystemProgram = '11111111111111111111111111111111',
  SerumDEXV3 = '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin',
  TokenProgram = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
}

interface PinnedAccountMap {
  [pubKey: string]: boolean;
}

function ProgramChangeView() {
  const dispatch = useAppDispatch();
  const { net, status } = useAppSelector(selectValidatorNetworkState);

  // TODO: I suspect It would be nicer to use a function need to try it..
  const selectAccounts = useAppSelector(selectAccountsListState);
  const { pinnedAccounts } = selectAccounts;

  const pinAccount = (pubKey: string, pinned: boolean) => {
    if (!pinned) {
      dispatch(accountsActions.unshift(pubKey));
    } else {
      dispatch(accountsActions.rm(pubKey));
    }
  };

  enum SortColumn {
    Count,
    Sol,
    MaxDelta,
  }

  const [displayList, setDisplayList] = useState<string[]>([]);
  // const [paused, setPausedState] = useState<boolean>(false);
  const [sortColumn, setSortColumn] = useState<SortColumn>(SortColumn.MaxDelta);
  const [validatorSlot, setValidatorSlot] = useState<number>(0);
  const [pinnedAccount, setPinnedAccount] = useState<PinnedAccountMap>({});

  function sortFunction(a: AccountInfo, b: AccountInfo) {
    switch (sortColumn) {
      case SortColumn.Count:
        return b.count - a.count;
      case SortColumn.Sol:
        if (!b.accountInfo || !a.accountInfo) {
          return 0;
        }
        return b.accountInfo.lamports - a.accountInfo.lamports;
      case SortColumn.MaxDelta:
      default:
        return Math.abs(b.maxDelta) - Math.abs(a.maxDelta);
    }
  }

  useInterval(() => {
    if (status !== NetStatus.Running) {
      return;
    }
    const pinMap: PinnedAccountMap = {};

    const showKeys: string[] = []; // list of Keys
    pinnedAccounts.forEach((key: string) => {
      showKeys.push(key);
      pinMap[key] = true;
    });

    const changes = GetTopAccounts(
      net,
      MAX_PROGRAM_CHANGES_DISPLAYED,
      sortFunction
    );

    // logger.info('GetTopAccounts', changes);
    changes.forEach((c: string) => {
      if (!(c in pinnedAccount)) {
        showKeys.push(c);
      }
    });
    setPinnedAccount(pinMap);
    setDisplayList(showKeys);
  }, 666);

  const uniqueAccounts = displayList.length;
  const [filterDropdownShow, setFilterDropdownShow] = useState(false);
  const filterProgramIDRef = useRef<HTMLInputElement>({} as HTMLInputElement);

  const [programID, setProgramID] = useState(KnownProgramID.SystemProgram);
  const [anchorEl, setAnchorEl] = useState<Keypair | undefined>(undefined);

  useEffect(() => {
    if (status !== NetStatus.Running) {
      return () => {};
    }
    setDisplayList([]);
    subscribeProgramChanges(net, programID, setValidatorSlot);

    return () => {
      setDisplayList([]);
      unsubscribeProgramChanges(net, programID);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [net, programID, status]);

  if (status !== NetStatus.Running) {
    return <div>network not available</div>;
  }

  const changeFilterDropdownTitle = (
    <>
      <FontAwesomeIcon className="me-1" icon={faFilter} />
      <span>Filter</span>
    </>
  );

  return (
    <div>
      <div className="mb-2">
        <div className="mb-2">
          <small>
            <strong>Program Account Changes</strong>:
            <small>(Validator Slot {validatorSlot})</small>
          </small>
        </div>
        <ButtonToolbar aria-label="Toolbar with button groups">
          <ButtonGroup size="sm" className="me-2" aria-label="First group">
            <Dropdown>
              <OutsideClickHandler
                onOutsideClick={() => setFilterDropdownShow(false)}
                display="inline"
              >
                <DropdownButton
                  size="sm"
                  id="dropdown-basic-button"
                  title={changeFilterDropdownTitle}
                  onSelect={(s: string | null) => {
                    setFilterDropdownShow(false);
                    if (s) setProgramID(s as KnownProgramID);
                  }}
                  onClick={() => {
                    if (!filterDropdownShow) {
                      setFilterDropdownShow(true);
                    } else {
                      setFilterDropdownShow(false);
                    }
                  }}
                  className="ms-2 d-inline"
                  variant="light"
                  show={filterDropdownShow}
                >
                  <div className="ms-1 p-1 border-bottom border-light">
                    <small>
                      <strong>Program ID</strong>
                    </small>
                  </div>
                  <Dropdown.Item eventKey="">
                    <small>System Program</small>
                  </Dropdown.Item>
                  <Dropdown.Item eventKey={KnownProgramID.TokenProgram}>
                    <small>Token Program</small>
                  </Dropdown.Item>
                  <Dropdown.Item eventKey={KnownProgramID.SerumDEXV3}>
                    <small>Serum DEX V3</small>
                  </Dropdown.Item>
                  <div className="p-2">
                    <EdiText
                      type="text"
                      value={programID}
                      onSave={(val: string) => {
                        const pastedID = val;
                        if (pastedID.match(BASE58_PUBKEY_REGEX)) {
                          unsubscribeProgramChanges(net, programID);
                          subscribeProgramChanges(
                            net,
                            programID,
                            setValidatorSlot
                          );
                          setProgramID(pastedID);
                        } else {
                          toast.warn(`Invalid program ID: ${pastedID}`);
                        }
                        filterProgramIDRef.current.value = 'Custom';
                        filterProgramIDRef.current.blur();
                        setFilterDropdownShow(false);
                      }}
                    />
                  </div>
                </DropdownButton>
              </OutsideClickHandler>
            </Dropdown>
          </ButtonGroup>
          <ButtonGroup size="sm" className="me-2" aria-label="First group">
            <OverlayTrigger
              // trigger="click"
              placement="right"
              show={anchorEl !== undefined}
              overlay={
                <Popover className="mb-6" id="popover-basic">
                  <Popover.Header as="h3">
                    New Account
                    <Button
                      onClick={() => {
                        setAnchorEl(undefined);
                      }}
                    >
                      X
                    </Button>
                  </Popover.Header>
                  <Popover.Body>
                    <div>New Account Keypair created.</div>
                    <div>
                      Public Key:{' '}
                      <pre>
                        <code>{anchorEl?.publicKey.toString()}</code>
                      </pre>
                    </div>
                    <div>
                      Private Key: (keep this in a <code>.json</code> file
                      somewhere safe)
                    </div>
                    <textarea
                      className="vscroll almost-vh-100 w-100"
                      readOnly
                      value={`[${anchorEl?.secretKey.toString()}]`}
                    />
                    <b>
                      NOTE: This account does not exist on chain until you
                      Airdrop or transfer SOL to it.
                    </b>
                  </Popover.Body>
                </Popover>
              }
            >
              <Button
                onClick={() => {
                  const newAccount = createNewAccount();
                  pinAccount(newAccount.publicKey.toString(), false);
                  dispatch(setSelected(newAccount.publicKey.toString()));
                  // or do we save it to the backend? and defer getting it back to 0.4.0..
                  setAnchorEl(newAccount);
                }}
              >
                Create Account
              </Button>
            </OverlayTrigger>

            <WatchAccountButton pinAccount={pinAccount} />
          </ButtonGroup>
        </ButtonToolbar>
        <span>
          <small className="ms-2 text-secondary">
            <span>
              Program:
              <code className="me-2">{programID}</code>
              {`${uniqueAccounts} account${uniqueAccounts > 1 ? 's' : ''}`}
            </span>
          </small>
        </span>
      </div>
      <div>
        {displayList.length > 0 ? (
          <Table hover size="sm">
            <tbody>
              <tr>
                <th>
                  {' '}
                  <FontAwesomeIcon className="me-1" icon={faRegular.faStar} />
                </th>
                <th>Address</th>
                <th onClick={() => setSortColumn(SortColumn.MaxDelta)}>
                  Max Δ{' '}
                  <FontAwesomeIcon
                    className="me-1"
                    icon={
                      sortColumn === SortColumn.MaxDelta
                        ? faSortDesc
                        : faUnsorted
                    }
                  />
                </th>
                <th onClick={() => setSortColumn(SortColumn.Sol)}>
                  SOL{' '}
                  <FontAwesomeIcon
                    className="me-1"
                    icon={
                      sortColumn === SortColumn.Sol ? faSortDesc : faUnsorted
                    }
                  />
                </th>
                <th onClick={() => setSortColumn(SortColumn.Count)}>
                  Count{' '}
                  <FontAwesomeIcon
                    className="me-1"
                    icon={
                      sortColumn === SortColumn.Count ? faSortDesc : faUnsorted
                    }
                  />
                </th>
              </tr>
              {displayList
                .slice(0, MAX_PROGRAM_CHANGES_DISPLAYED)
                .map((pubKey: string) => {
                  return (
                    <ProgramChange
                      selected={pubKey === selectAccounts.selectedAccount}
                      key={pubKey}
                      pubKey={pubKey}
                      net={net}
                      pinned={pinnedAccount[pubKey]}
                      pinAccount={pinAccount}
                    />
                  );
                })}
            </tbody>
          </Table>
        ) : (
          <div>
            <FontAwesomeIcon className="me-1 fa-spin" icon={faSpinner} />
            <small className="me-2">Scanning for program changes...</small>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProgramChangeView;
