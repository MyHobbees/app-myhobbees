import * as React from 'react';
import {Pagination} from '@shopify/hydrogen';
import {ArrowDown, ArrowUp} from 'lucide-react';

/**
 * Encapsulates the previous and next pagination behaviors.
 */
export function PaginatedResourceSection<NodesType>({
  connection,
  children,
  ariaLabel,
  resourcesClassName,
}: {
  connection: React.ComponentProps<typeof Pagination<NodesType>>['connection'];
  children: (args: {
    node: NodesType;
    index: number;
  }) => React.ReactElement | null;
  ariaLabel?: string;
  resourcesClassName?: string;
}) {
  return (
    <Pagination connection={connection}>
      {({nodes, isLoading, PreviousLink, NextLink}) => {
        const resourcesMarkup = nodes.map((node, index) =>
          children({node, index}),
        );

        return (
          <div>
            <PreviousLink>
              {isLoading ? (
                'Chargement…'
              ) : (
                <span>
                  <ArrowUp aria-hidden="true" /> Voir les précédents
                </span>
              )}
            </PreviousLink>
            {resourcesClassName ? (
              <div
                aria-label={ariaLabel}
                className={resourcesClassName}
                role={ariaLabel ? 'region' : undefined}
              >
                {resourcesMarkup}
              </div>
            ) : (
              resourcesMarkup
            )}
            <NextLink>
              {isLoading ? (
                'Chargement…'
              ) : (
                <span>
                  Voir plus <ArrowDown aria-hidden="true" />
                </span>
              )}
            </NextLink>
          </div>
        );
      }}
    </Pagination>
  );
}
