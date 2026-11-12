import { useMutation } from "@tanstack/react-query";
import { api, unwrap, type components } from "@/lib/api/client";

export type InspectResult = components["schemas"]["VietQrInfoModel"];
export type InspectInput =
  { kind: "payload"; payload: string } | { kind: "image"; file: File };

/** Parse a pasted Payload (/parse) or Decode an uploaded image (/decode) into one result shape. */
export function useInspect() {
  return useMutation<InspectResult, Error, InspectInput>({
    mutationFn: (input) =>
      input.kind === "payload"
        ? unwrap(
            api.POST("/api/v1/vietqr-core/parse", {
              body: { qrCode: input.payload.trim() },
            }),
          )
        : unwrap(
            api.POST("/api/v1/vietqr-core/decode", {
              // Multipart: let the browser set the boundary; openapi-fetch needs the FormData built here.
              body: { file: input.file as unknown as string },
              bodySerializer: () => {
                const form = new FormData();
                form.append("file", input.file);
                return form;
              },
            }),
          ),
  });
}
