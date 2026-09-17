import test from "node:test";
import assert from "node:assert/strict";
import { builtInSkills, getSkillPath } from "./skills.js";

test("built-in skills use safe names", () => {
  assert.equal(builtInSkills.length > 0, true);
  for (const skill of builtInSkills) assert.match(skill.name, /^[a-z0-9][a-z0-9-]{0,63}$/);
});

test("getSkillPath rejects traversal names", () => {
  assert.throws(() => getSkillPath("../outside"), /Invalid skill name/);
  assert.throws(() => getSkillPath("skill/name"), /Invalid skill name/);
});
