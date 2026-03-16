import awsLambdaFastify from "@fastify/aws-lambda";
import type { APIGatewayProxyEventV2, Context } from "aws-lambda";
import { buildApp } from "@common/utils/build-app";

type myApp = ReturnType<typeof buildApp>;

export function createLambdaHandler(registerRoutes: (app: myApp) => void) {
  const app = buildApp();
  registerRoutes(app);

  const proxy = awsLambdaFastify(app);

  return async (event: APIGatewayProxyEventV2, context: Context) => {
    // Needed to avoid lambda waiting for db connections to close or open new connections
    // on invocations and allows lambda to send responses even when the event loop is not empty.
    // This only effects lambdas and will not be run when the app is ran as a server
    context.callbackWaitsForEmptyEventLoop = false;
    return proxy(event, context);
  };
}
