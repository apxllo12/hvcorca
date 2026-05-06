import { HttpService } from "@rbxts/services";
import { IS_DEV } from "constants";

export async function request(requestOptions: RequestAsyncRequest): Promise<RequestAsyncResponse> {
	if (IS_DEV) {
		return HttpService.RequestAsync(requestOptions);
	} else {
		const fn = syn ? syn.request : request;
		if (!fn) {
			throw "request/syn.request is not available";
		}
		return fn(requestOptions);
	}
}

export async function get(url: string, requestType?: Enum.HttpRequestType): Promise<string> {
	const [ok, result] = pcall(() => {
		return game.HttpGetAsync(url, requestType);
	});
	if (!ok) {
		warn("[HTTP] GET failed for: " + url);
		return "";
	}
	return result;
}

export async function post(
	url: string,
	data: string,
	contentType?: string,
	requestType?: Enum.HttpRequestType,
): Promise<string> {
	const [ok, result] = pcall(() => {
		return game.HttpPostAsync(url, data, contentType, requestType);
	});
	if (!ok) {
		warn("[HTTP] POST failed for: " + url);
		return "";
	}
	return result;
}
