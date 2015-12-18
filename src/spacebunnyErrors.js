import errorFactory from 'error-factory';

exports.MissingProtocolHandler = errorFactory('MissingProtocolHandler');
exports.ApiKeyOrConfigurationsRequired = errorFactory('ApiKeyOrConfigurationsRequired');
exports.EndPointNotReachable = errorFactory('EndPointNotReachable');
exports.EndPointError = errorFactory('EndPointError');
