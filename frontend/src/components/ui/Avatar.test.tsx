import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Avatar } from "./Avatar";

describe("Avatar", () => {
  it("renders the first letter of the username uppercased", () => {
    render(<Avatar username="alice" />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("renders uppercase initial for lowercase username", () => {
    render(<Avatar username="bob" />);
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("uses the username as the title attribute", () => {
    render(<Avatar username="carol" />);
    expect(screen.getByTitle("carol")).toBeInTheDocument();
  });

  it("applies the sm size class", () => {
    const { container } = render(<Avatar username="alice" size="sm" />);
    expect(container.firstChild).toHaveClass("w-8", "h-8");
  });

  it("applies the lg size class", () => {
    const { container } = render(<Avatar username="alice" size="lg" />);
    expect(container.firstChild).toHaveClass("w-12", "h-12");
  });

  it("applies the same color for the same username deterministically", () => {
    const { container: a } = render(<Avatar username="alice" />);
    const { container: b } = render(<Avatar username="alice" />);
    const classA = (a.firstChild as HTMLElement).className;
    const classB = (b.firstChild as HTMLElement).className;
    expect(classA).toBe(classB);
  });

  it("applies different colors for different usernames", () => {
    const { container: a } = render(<Avatar username="alice" />);
    const { container: b } = render(<Avatar username="bob" />);
    const classA = (a.firstChild as HTMLElement).className;
    const classB = (b.firstChild as HTMLElement).className;
    expect(classA).not.toBe(classB);
  });
});
