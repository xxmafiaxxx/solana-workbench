import * as sol from '@solana/web3.js';
import { useEffect, useState } from 'react';
import { logger } from '../common/globals';
import {
  NetStatus,
  netToURL,
  selectValidatorNetworkState,
} from '../data/ValidatorNetwork/validatorNetworkState';
import { useAppSelector } from '../hooks';

export interface LogSubscriptionMap {
  [net: string]: {
    subscriptionID: number;
    solConn: sol.Connection;
  };
}

// TODO: make this selectable - Return information at the selected commitment level
//      [possible values: processed, confirmed, finalized]
//      cli default seems to be finalized

const commitmentLevel = 'processed';

const logSubscriptions: LogSubscriptionMap = {};

function LogView() {
  const [logs, setLogs] = useState<string[]>([]);
  const { net, status } = useAppSelector(selectValidatorNetworkState);

  useEffect(() => {
    setLogs([]);

    if (status !== NetStatus.Running) {
      return () => {};
    }

    const solConn = new sol.Connection(netToURL(net));
    const subscriptionID = solConn.onLogs(
      'all',
      (logsInfo) => {
        setLogs((prevLogs: string[]) => {
          const newLogs = [
            logsInfo.signature,
            logsInfo.err?.toString() || 'Ok',
            ...logsInfo.logs.reverse(),
            ...prevLogs,
          ];

          // utter pseudo-science -- determine max log lines from window size
          const MAX_DISPLAYED_LOG_LINES = (3 * window.innerHeight) / 22;
          if (newLogs.length > MAX_DISPLAYED_LOG_LINES) {
            return newLogs.slice(0, MAX_DISPLAYED_LOG_LINES);
          }
          return newLogs;
        });
      },
      commitmentLevel
    );
    logSubscriptions[net] = { subscriptionID, solConn };

    return () => {
      const sub = logSubscriptions[net];
      if (sub?.solConn) {
        sub.solConn
          .removeOnLogsListener(sub.subscriptionID)
          // eslint-disable-next-line promise/always-return
          .then(() => {
            delete logSubscriptions[net];
          })
          .catch(logger.info);
      }
    };
  }, [net, status]);

  return (
    <pre className="text-xs bg-surface-600 h-full p-2 whitespace-pre-wrap break-all overflow-auto">
      {logs.length > 0
        ? logs.join('\n')
        : 'Logs will appear here once transactions are processed.'}
    </pre>
  );
}

export default LogView;
