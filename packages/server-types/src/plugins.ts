import type {
  AnyFunctionMap,
  BaseContext,
  GraphQLServiceContext,
  GraphQLRequestContext,
  GraphQLResponse,
  GraphQLFieldResolverParams,
  GraphQLRequestContextDidResolveSource,
  GraphQLRequestContextParsingDidStart,
  GraphQLRequestContextValidationDidStart,
  GraphQLRequestContextDidResolveOperation,
  GraphQLRequestContextDidEncounterErrors,
  GraphQLRequestContextResponseForOperation,
  GraphQLRequestContextExecutionDidStart,
  GraphQLRequestContextWillSendResponse,
  GraphQLSchemaContext,
} from './types';

export interface ApolloServerPlugin<TContext extends BaseContext> {
  serverWillStart?(
    service: GraphQLServiceContext,
  ): Promise<GraphQLServerListener | void>;

  requestDidStart?(
    requestContext: GraphQLRequestContext<TContext>,
  ): Promise<GraphQLRequestListener<TContext> | void>;

  // See the similarly named field on ApolloServer for details. Note that it
  // appears that this only works if it is a *field*, not a *method*, which is
  // why `requestDidStart` (which takes a TContext wrapped in something) is not
  // sufficient.
  //
  // TODO(AS4): Upgrade to TS 4.7 and use `in` instead.
  __forceTContextToBeContravariant?: (contextValue: TContext) => void;
}

export interface GraphQLServerListener {
  schemaDidLoadOrUpdate?(schemaContext: GraphQLSchemaContext): void;

  // When your server is stopped (by calling `stop()` or via the
  // `SIGINT`/`SIGTERM` handlers), Apollo Server first awaits all `drainServer`
  // hooks in parallel. GraphQL operations can still execute while `drainServer`
  // is in progress. A typical use is to stop listening for new connections and
  // wait until all current connections are idle. The built-in
  // ApolloServerPluginDrainHttpServer implements this method.
  drainServer?(): Promise<void>;

  // When your server is stopped (by calling `stop()` or via the
  // `SIGINT`/`SIGTERM` handlers) then (after the `drainServer` phase finishes)
  // Apollo Server transitions into a state where no new operations will run and
  // then awaits all `drainServer` hooks in parallel. A typical use is to flush
  // outstanding observability data.
  serverWillStop?(): Promise<void>;

  // At most one plugin's serverWillStart may return a GraphQLServerListener
  // with this method. If one does, it is called once on server startup and the
  // page it returns is served to clients with `accept: text/html` headers. This
  // is an intentionally simple API; if you want to do something fancy to serve
  // a landing page, you probably should just define a handler in your web
  // framework.
  renderLandingPage?(): Promise<LandingPage>;
}

// The page served to clients with `accept: text/html` headers.
export interface LandingPage {
  html: string;
}

export type GraphQLRequestListenerParsingDidEnd = (
  err?: Error,
) => Promise<void>;
export type GraphQLRequestListenerValidationDidEnd = (
  err?: ReadonlyArray<Error>,
) => Promise<void>;
export type GraphQLRequestListenerExecutionDidEnd = (
  err?: Error,
) => Promise<void>;
export type GraphQLRequestListenerDidResolveField = (
  error: Error | null,
  result?: any,
) => void;

export interface GraphQLRequestListener<TContext extends BaseContext>
  extends AnyFunctionMap {
  didResolveSource?(
    requestContext: GraphQLRequestContextDidResolveSource<TContext>,
  ): Promise<void>;

  parsingDidStart?(
    requestContext: GraphQLRequestContextParsingDidStart<TContext>,
  ): Promise<GraphQLRequestListenerParsingDidEnd | void>;

  validationDidStart?(
    requestContext: GraphQLRequestContextValidationDidStart<TContext>,
  ): Promise<GraphQLRequestListenerValidationDidEnd | void>;

  didResolveOperation?(
    requestContext: GraphQLRequestContextDidResolveOperation<TContext>,
  ): Promise<void>;

  didEncounterErrors?(
    requestContext: GraphQLRequestContextDidEncounterErrors<TContext>,
  ): Promise<void>;

  // If this hook is defined, it is invoked immediately before GraphQL execution
  // would take place. If its return value resolves to a non-null
  // GraphQLResponse, that result is used instead of executing the query.
  // Hooks from different plugins are invoked in series and the first non-null
  // response is used.
  responseForOperation?(
    requestContext: GraphQLRequestContextResponseForOperation<TContext>,
  ): Promise<GraphQLResponse | null>;

  executionDidStart?(
    requestContext: GraphQLRequestContextExecutionDidStart<TContext>,
  ): Promise<GraphQLRequestExecutionListener<TContext> | void>;

  willSendResponse?(
    requestContext: GraphQLRequestContextWillSendResponse<TContext>,
  ): Promise<void>;
}

export interface GraphQLRequestExecutionListener<TContext extends BaseContext>
  extends AnyFunctionMap {
  executionDidEnd?: GraphQLRequestListenerExecutionDidEnd;
  // willResolveField is not async because we've observed that it already has
  // quite a performance impact on execution even without involving the Promise
  // queue. If we can come up with ways to alleviate the burden (eg having an
  // uninstrumented schema and an instrumented schema and only using the
  // instrumented schema for a subset of operations that need detailed
  // performance traces) we could be happier supporting async willResolveField.
  willResolveField?(
    fieldResolverParams: GraphQLFieldResolverParams<any, TContext>,
  ): GraphQLRequestListenerDidResolveField | void;
}