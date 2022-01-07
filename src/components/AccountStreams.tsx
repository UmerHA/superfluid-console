import {Network, sfApi} from "../redux/store";
import {FC, ReactElement, useState} from "react";
import {Account, createSkipPaging, Ordering, SkipPaging, Stream, StreamPeriod} from "@superfluid-finance/sdk-core";
import {AppDataGrid} from "./AppDataGrid";
import {GridColDef, GridRenderCellParams} from "@mui/x-data-grid";
import {StreamOrderBy} from "@superfluid-finance/sdk-core/src/subgraph/entities/stream/stream";
import AppLink from "./AppLink";
import {Button, Dialog} from "@mui/material";
import {StreamDetailsDialog} from "./StreamDetails";
import FlowingBalance from "./FlowingBalance";

interface Props {
  network: Network,
  account: Account
}

const AccountStreams: FC<Props> = ({network, account}): ReactElement => {
  // TODO(KK): cast sort field to orderby type

  const incomingStreamColumns: GridColDef[] = [
    {field: 'id', type: "string", hide: true, sortable: false},
    {field: 'sender', headerName: "Sender", flex: 1, sortable: false},
    {field: 'currentFlowRate', headerName: "Flow Rate", flex: 1, sortable: true},
    {
      field: 'streamedUntilUpdatedAt',
      headerName: "Total Streamed",
      flex: 1,
      sortable: false,
      renderCell: (params) => {
        const stream = params.row as Stream;
        return (<FlowingBalance
          {...{
            balance: stream.streamedUntilUpdatedAt,
            balanceTimestamp: stream.updatedAtTimestamp,
            flowRate: stream.currentFlowRate
          }}
        />)
      }
    },
    {field: 'token', headerName: "Token", flex: 1, sortable: false},
    {
      field: 'details', headerName: "Details", flex: 1, sortable: false, renderCell: (cellParams) => (
        <StreamDetailsDialog network={network} streamId={cellParams.id.toString()}/>
      )
    }
  ];

  const [incomingStreamOrdering, setIncomingStreamOrdering] = useState<Ordering<StreamOrderBy> | undefined>(undefined);
  const [incomingStreamPaging, setIncomingStreamPaging] = useState<SkipPaging>(createSkipPaging({
    take: 10
  }));

  const incomingStreamsQuery = sfApi.useStreamsQuery({
    chainId: network.chainId,
    filter: {
      receiver: account.id
    },
    pagination: incomingStreamPaging,
    order: incomingStreamOrdering
  });

  const incomingStreamRows: Stream[] = incomingStreamsQuery.data ? incomingStreamsQuery.data.data : [];

  const [outgoingStreamOrdering, setOutgoingStreamOrdering] = useState<Ordering<StreamOrderBy> | undefined>(undefined);
  const [outgoingStreamPaging, setOutgoingStreamPaging] = useState<SkipPaging>(createSkipPaging({
    take: 10
  }));

  const outgoingStreamColumns: GridColDef[] = [
    {field: 'id', hide: true, flex: 1},
    {field: 'receiver', headerName: "Receiver", sortable: false, flex: 1},
    {field: 'currentFlowRate', headerName: "Flow Rate", sortable: true, flex: 1},
    {field: 'token', headerName: "Token", sortable: false, flex: 1},
    {
      field: 'details', headerName: "Details", flex: 1, sortable: false, renderCell: (cellParams) => (
        <StreamDetailsDialog network={network} streamId={cellParams.id.toString()}/>
      )
    }
  ];

  const outgoingStreamsQuery = sfApi.useStreamsQuery({
    chainId: network.chainId,
    filter: {
      sender: account.id
    },
    pagination: outgoingStreamPaging,
    order: outgoingStreamOrdering
  });

  const outgoingStreamRows: Stream[] = outgoingStreamsQuery.data ? outgoingStreamsQuery.data.data : [];

  // TODO(KK): get rid of anys

  return (<>
    <>INCOMING</>
    <div style={{height: 640, width: "100%"}}>
      <AppDataGrid columns={incomingStreamColumns} rows={incomingStreamRows} queryResult={incomingStreamsQuery}
                   setPaging={setIncomingStreamPaging} ordering={incomingStreamOrdering}
                   setOrdering={(x: any) => setIncomingStreamOrdering(x)}/>
    </div>
    <p>OUTGOING</p>
    <div style={{height: 640, width: "100%"}}>
      <AppDataGrid columns={outgoingStreamColumns} rows={outgoingStreamRows} queryResult={outgoingStreamsQuery}
                   setPaging={setOutgoingStreamPaging} ordering={outgoingStreamOrdering}
                   setOrdering={(x: any) => setOutgoingStreamOrdering(x)}/>
    </div>
  </>);
}

export default AccountStreams;