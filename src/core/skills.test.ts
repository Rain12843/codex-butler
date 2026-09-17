import test from "node:test";
import assert from "node:assert/strict";
import { builtInSkills, getSkillPath, showSkill } from "./skills.js";

test("built-in skills have safe names", () => {
  assert.equal(builtInSkills.length > 0, true);
  for (const skill of builtInSkills) assert.match(skill.name, /^[a-z0-9][a-z0-9-]{0,63}$/);
});

test("getSkillPath rejects traversal names", () => {
  assert.throws(() => getSkillPath("../outside"), /Invalid skill name/);
  assert.throws(() => getSkillPath("skill/name"), /Invalid skill name/);
});

test("showSkill returns built-in skill markdown", async () => {
  const content = await showSkill("testing");
  assert.match(content, /^---\nname: testing\n/);
  assert.match(content, /## Checklist/);
  assert.match(content, /happy path/);
});

test("showSkill rejects unknown names", async () => {
  await assert.rejects(showSkill("does-not-exist-xyz"), /Skill not found/);
});
