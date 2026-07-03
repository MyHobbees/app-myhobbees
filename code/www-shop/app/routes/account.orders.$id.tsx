import {redirect, useLoaderData} from 'react-router';
import type {Route} from './+types/account.orders.$id';
import {Money, Image} from '@shopify/hydrogen';
import type {
  OrderLineItemFullFragment,
  OrderQuery,
} from 'customer-accountapi.generated';
import {CUSTOMER_ORDER_QUERY} from '~/graphql/customer-account/CustomerOrderQuery';

export const meta: Route.MetaFunction = ({data}) => {
  return [{title: `Commande ${data?.order?.name} | My Hobbees`}];
};

export async function loader({params, context}: Route.LoaderArgs) {
  const {customerAccount} = context;
  if (!params.id) {
    return redirect('/account/orders');
  }

  const orderId = atob(params.id);
  const {data, errors}: {data: OrderQuery; errors?: Array<{message: string}>} =
    await customerAccount.query(CUSTOMER_ORDER_QUERY, {
      variables: {
        orderId,
        language: customerAccount.i18n.language,
      },
    });

  if (errors?.length || !data?.order) {
    throw new Error('Order not found');
  }

  const {order} = data;

  // Extract line items directly from nodes array
  const lineItems = order.lineItems.nodes;

  // Extract discount applications directly from nodes array
  const discountApplications = order.discountApplications.nodes;

  // Get fulfillment status from first fulfillment node
  // Get first discount value with proper type checking
  const firstDiscount = discountApplications[0]?.value;

  // Type guard for MoneyV2 discount
  const discountValue =
    firstDiscount?.__typename === 'MoneyV2'
      ? (firstDiscount as Extract<
          typeof firstDiscount,
          {__typename: 'MoneyV2'}
        >)
      : null;

  // Type guard for percentage discount
  const discountPercentage =
    firstDiscount?.__typename === 'PricingPercentageValue'
      ? (
          firstDiscount as Extract<
            typeof firstDiscount,
            {__typename: 'PricingPercentageValue'}
          >
        ).percentage
      : null;

  return {
    order,
    lineItems,
    discountValue,
    discountPercentage,
  };
}

export default function OrderRoute() {
  const {
    order,
    lineItems,
    discountValue,
    discountPercentage,
  } = useLoaderData<typeof loader>();
  return (
    <div className="account-order">
      <h2>Commande {order.name}</h2>
      <p>
        Passée le{' '}
        {order.processedAt
          ? new Date(order.processedAt).toLocaleDateString('fr-FR')
          : 'date indisponible'}
      </p>
      {order.confirmationNumber && (
        <p>Confirmation : {order.confirmationNumber}</p>
      )}
      <br />
      <div>
        <table>
          <thead>
            <tr>
              <th scope="col">Produit</th>
              <th scope="col">Prix</th>
              <th scope="col">Quantité</th>
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((lineItem, lineItemIndex) => (
              // eslint-disable-next-line react/no-array-index-key
              <OrderLineRow key={lineItemIndex} lineItem={lineItem} />
            ))}
          </tbody>
          <tfoot>
            {((discountValue && discountValue.amount) ||
              discountPercentage) && (
              <tr>
                <th scope="row" colSpan={3}>
                  <p>Réductions</p>
                </th>
                <td>
                  {discountPercentage ? (
                    <span>-{discountPercentage} %</span>
                  ) : (
                    discountValue && <Money data={discountValue!} />
                  )}
                </td>
              </tr>
            )}
            <tr>
              <th scope="row" colSpan={3}>
                <p>Sous-total</p>
              </th>
              <td>
                {order.subtotal ? <Money data={order.subtotal} /> : '—'}
              </td>
            </tr>
            <tr>
              <th scope="row" colSpan={3}>
                Taxes
              </th>
              <td>
                {order.totalTax ? <Money data={order.totalTax} /> : '—'}
              </td>
            </tr>
            <tr>
              <th scope="row" colSpan={3}>
                Total
              </th>
              <td>
                <Money data={order.totalPrice!} />
              </td>
            </tr>
          </tfoot>
        </table>
        <div>
          <h3>Adresse de livraison</h3>
          {order?.shippingAddress ? (
            <address>
              <p>{order.shippingAddress.name}</p>
              {order.shippingAddress.formatted ? (
                <p>{order.shippingAddress.formatted}</p>
              ) : (
                ''
              )}
              {order.shippingAddress.formattedArea ? (
                <p>{order.shippingAddress.formattedArea}</p>
              ) : (
                ''
              )}
            </address>
          ) : (
            <p>Aucune adresse de livraison définie.</p>
          )}
          <h3>Statut</h3>
          <p>{getFulfillmentStatusLabel(order.fulfillmentStatus)}</p>
        </div>
      </div>
      <br />
      <p>
        <a target="_blank" href={order.statusPageUrl} rel="noreferrer">
          Voir le statut de la commande →
        </a>
      </p>
    </div>
  );
}

const FULFILLMENT_STATUS_LABELS: Record<string, string> = {
  FULFILLED: 'Traitée',
  IN_PROGRESS: 'En cours',
  ON_HOLD: 'En attente',
  OPEN: 'Non traitée',
  PARTIALLY_FULFILLED: 'Partiellement traitée',
  PENDING_FULFILLMENT: 'Traitement en attente',
  READY_FOR_DELIVERY: 'Prête à être livrée',
  READY_FOR_PICKUP: 'Prête à être récupérée',
  RESTOCKED: 'Remise en stock',
  SCHEDULED: 'Planifiée',
  UNFULFILLED: 'Non traitée',
};

function getFulfillmentStatusLabel(status?: string | null) {
  if (!status) return 'Non renseigné';
  return FULFILLMENT_STATUS_LABELS[status] ?? status;
}

function OrderLineRow({lineItem}: {lineItem: OrderLineItemFullFragment}) {
  return (
    <tr key={lineItem.id}>
      <td>
        <div>
          {lineItem?.image && (
            <div>
              <Image data={lineItem.image} width={96} height={96} />
            </div>
          )}
          <div>
            <p>{lineItem.title}</p>
            <small>{lineItem.variantTitle}</small>
          </div>
        </div>
      </td>
      <td>
        {lineItem.price ? <Money data={lineItem.price} /> : '—'}
      </td>
      <td>{lineItem.quantity}</td>
      <td>
        {lineItem.totalPrice ? <Money data={lineItem.totalPrice} /> : '—'}
      </td>
    </tr>
  );
}
