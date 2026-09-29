// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import QRCode from "qrcode";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemberForm } from "@/components/member-form";
import { qrFileName } from "@/lib/format";
import { memberSchema, type MemberFormValues } from "@/lib/validation";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const fillName = (value: string) => fireEvent.change(screen.getByLabelText(/Member Name/), { target: { value } });
const submitButton = () => screen.getByRole("button", { name: "Submit Registration" });

describe("registration form", () => {
  it("prevents double submission: one request, button disabled while it is pending", () => {
    const fetchMock = vi.fn(() => new Promise<Response>(() => {}));
    vi.stubGlobal("fetch", fetchMock);
    render(<MemberForm mode="register" />);
    fillName("Jane Doe");
    const button = submitButton();
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.submit(button.closest("form")!);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /Submitting/ })).toHaveProperty("disabled", true);
  });

  it("validates on the client and never calls the API with bad input", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<MemberForm mode="register" />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "not-an-email" } });
    fireEvent.change(screen.getByLabelText("Website"), { target: { value: "javascript:alert(1)" } });
    fireEvent.click(submitButton());
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await screen.findByText("Member name is required.")).toBeTruthy();
    expect(screen.getByText("Enter a valid email address.")).toBeTruthy();
    expect(screen.getByText(/Enter a valid website/)).toBeTruthy();
    expect(screen.getByLabelText(/Member Name/).getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(screen.getByLabelText(/Member Name/));
  });

  it("shows server errors without losing the entered data", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: "Too many registrations." }, { status: 429 })));
    render(<MemberForm mode="register" />);
    fillName("Jane Doe");
    fireEvent.click(submitButton());
    expect(await screen.findByRole("button", { name: "Submit Registration" })).toHaveProperty("disabled", false);
    expect(screen.getByLabelText(/Member Name/)).toHaveProperty("value", "Jane Doe");
  });

  it("shows the success screen with a QR code that encodes only the public profile URL", async () => {
    const toDataURL = vi.spyOn(QRCode, "toDataURL");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ member: { publicToken: "abc123", memberName: "Jane Doe" } }, { status: 201 })),
    );
    render(<MemberForm mode="register" />);
    fillName("Jane Doe");
    fireEvent.click(submitButton());

    expect(await screen.findByRole("heading", { name: "Registration Successful!" })).toBeTruthy();
    expect(screen.getByText("http://localhost:3000/member/abc123")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Copy Link/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Share/ })).toBeTruthy();
    expect(toDataURL.mock.calls[0]?.[0]).toBe("http://localhost:3000/member/abc123");

    const download = await screen.findByRole("link", { name: /Download QR/ });
    expect(download.getAttribute("download")).toBe("member-jane-doe-qr.png");
    expect(download.getAttribute("href")).toMatch(/^data:image\/png;base64,/);
  });
});

describe("photo field (edit mode)", () => {
  const initialValues = {
    ...Object.fromEntries(Object.keys(memberSchema.shape).map((key) => [key, ""])),
    memberName: "Jane Doe",
    photo: "/api/members/public/t/photo?v=1",
  } as MemberFormValues;
  const sentBody = async (fetchMock: ReturnType<typeof vi.fn>) => {
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    return JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
  };

  it("leaves an unchanged photo out of the update, so the server keeps it", async () => {
    const fetchMock = vi.fn(async () => Response.json({ member: { id: "m1" } }));
    vi.stubGlobal("fetch", fetchMock);
    render(<MemberForm mode="edit" memberId="m1" initialValues={initialValues} />);
    expect(await sentBody(fetchMock)).not.toHaveProperty("photo");
  });

  it('sends "" when the photo is removed', async () => {
    const fetchMock = vi.fn(async () => Response.json({ member: { id: "m1" } }));
    vi.stubGlobal("fetch", fetchMock);
    render(<MemberForm mode="edit" memberId="m1" initialValues={initialValues} />);
    fireEvent.click(screen.getByRole("button", { name: /Remove/ }));
    expect((await sentBody(fetchMock)).photo).toBe("");
  });
});

describe("QR sharing", () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, "share");
    Reflect.deleteProperty(navigator, "canShare");
  });

  it("shares the QR image itself, with the profile link in the text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ member: { publicToken: "abc123", memberName: "Jane Doe" } }, { status: 201 })),
    );
    const share = vi.fn<(data: ShareData) => Promise<void>>(async () => {});
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    Object.defineProperty(navigator, "canShare", { value: () => true, configurable: true });

    render(<MemberForm mode="register" />);
    fillName("Jane Doe");
    fireEvent.click(submitButton());
    await screen.findByRole("link", { name: /Download QR/ }); // QR image is ready
    fireEvent.click(screen.getByRole("button", { name: /Share/ }));

    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    const data = share.mock.calls[0]![0];
    expect(data.files?.[0]).toMatchObject({ name: "member-jane-doe-qr.png", type: "image/png" });
    expect(data.files![0]!.size).toBeGreaterThan(500);
    expect(data.text).toContain("http://localhost:3000/member/abc123");
  });
});

describe("QR file names", () => {
  it("sanitises the member name", () => {
    expect(qrFileName("John Doe")).toBe("member-john-doe-qr.png");
    expect(qrFileName("  Zoë  O'Brien & Co. ")).toBe("member-zoe-o-brien-co-qr.png");
    expect(qrFileName("../../etc/passwd")).toBe("member-etc-passwd-qr.png");
    expect(qrFileName("محمد")).toBe("member-profile-qr.png");
  });
});
