import {sfSubgraph} from "../redux/store";
import {skipToken} from "@reduxjs/toolkit/query";
import {ethers} from "ethers";
import {gql} from "graphql-request";
import {networks} from "../redux/networks";
import {useAppDispatch, useAppSelector} from "../redux/hooks";
import {useMemo} from "react";
import {addressBookSelectors} from "../redux/slices/addressBook.slice";
import {searchHistorySlice} from "../redux/slices/searchHistory.slice";

const searchByAddressDocument = gql`
  query Search($addressId: ID, $addressBytes: Bytes) {
    tokensByAddress: tokens(where: { id: $addressId, isSuperToken: true }) {
      id
      symbol
      name
      isListed
    }
    tokensByUnderlyingAddress: tokens(
      where: { isSuperToken: true, underlyingAddress: $addressBytes }
    ) {
      id
      symbol
      name
      isListed
    }
    accounts(where: { id: $addressId }) {
      id
    }
  }
`;

const searchByTokenSymbolDocument = gql`
  query Search($tokenSymbol: String) {
    tokensBySymbol: tokens(
      where: { isSuperToken: true, symbol_contains: $tokenSymbol }
    ) {
      id
      symbol
      name
      isListed
    }
  }
`;

type SubgraphSearchByAddressResult = {
  tokensByAddress: {
    id: string;
    symbol: string;
    name: string;
    isListed: boolean;
  }[];
  tokensByUnderlyingAddress: {
    id: string;
    symbol: string;
    name: string;
    isListed: boolean;
  }[];
  accounts: {
    id: string;
  }[];
};

type SubgraphSearchByTokenSymbolResult = {
  tokensBySymbol: {
    id: string;
    symbol: string;
    name: string;
    isListed: boolean;
  }[];
};

export const useSearchAddressBook = (searchTerm: string) => {
  const isSearchTermAddress = useMemo(
    () => ethers.utils.isAddress(searchTerm),
    [searchTerm]
  );

  return networks.map((network) => {
    const addressBookEntries = useAppSelector((state) =>
      searchTerm !== "" && !isSearchTermAddress
        ? addressBookSelectors
            .selectAll(state)
            .filter((x) => x.chainId === network.chainId)
        : []
    );

    return {
      network: network,
      accounts: addressBookEntries
        .filter((x) => x.nameTag.toLowerCase().includes(searchTerm))
        .map((x) => ({ id: x.address })),
    };
  });
};

export const useSearchSubgraphByAddress = (searchTerm: string) => {
  const isSearchTermAddress = useMemo(
    () => ethers.utils.isAddress(searchTerm),
    [searchTerm]
  );

  const dispatch = useAppDispatch();
  const lastSearchAddress = useAppSelector(
    (state) => state.searchHistory.ids[0] as string
  );

  const results = networks.map((network) =>
    sfSubgraph.useCustomQuery(
      isSearchTermAddress
        ? {
            chainId: network.chainId,
            document: searchByAddressDocument,
            variables: {
              addressId: searchTerm.toLowerCase(),
              addressBytes: searchTerm.toLowerCase(),
            },
          }
        : skipToken
    )
  );

  if (
    isSearchTermAddress &&
    searchTerm.toLowerCase() !== lastSearchAddress?.toLowerCase()
  ) {
    const areThereAnyResults =
      results
        .map(
          (x) =>
            (x.data as SubgraphSearchByAddressResult | undefined) ?? {
              tokensByAddress: [],
              tokensByUnderlyingAddress: [],
              accounts: [],
            }
        )
        .map((x) =>
          ([] as any)
            .concat(x.tokensByAddress)
            .concat(x.tokensByUnderlyingAddress)
            .concat(x.accounts)
        ).length >= 1;

    if (areThereAnyResults) {
      dispatch(
        searchHistorySlice.actions.searchMatched({
          address: ethers.utils.getAddress(searchTerm),
          timestamp: new Date().getTime(),
        })
      );
    }
  }

  return results;
};

export const useSearchSubgraphByTokenSymbol = (searchTerm: string) => {
  const isSearchTermAddress = useMemo(
    () => ethers.utils.isAddress(searchTerm),
    [searchTerm]
  );

  return networks.map((network) =>
    sfSubgraph.useCustomQuery(
      !isSearchTermAddress && searchTerm.length > 2
        ? {
            chainId: network.chainId,
            document: searchByTokenSymbolDocument,
            variables: {
              tokenSymbol: searchTerm,
            },
          }
        : skipToken
    )
  );
};