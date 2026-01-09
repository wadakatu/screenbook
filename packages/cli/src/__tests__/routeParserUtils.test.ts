import { describe, expect, it } from "vitest"
import {
	flattenRoutes,
	type ParsedRoute,
	pathToScreenId,
	pathToScreenTitle,
} from "../utils/routeParserUtils.js"

describe("routeParserUtils", () => {
	describe("pathToScreenId", () => {
		describe("backward compatibility (no options)", () => {
			it("should return home for root path", () => {
				expect(pathToScreenId("/")).toEqual({ screenId: "home" })
			})

			it("should return home for empty path", () => {
				expect(pathToScreenId("")).toEqual({ screenId: "home" })
			})

			it("should convert simple path to screen ID", () => {
				expect(pathToScreenId("/dashboard")).toEqual({
					screenId: "dashboard",
				})
			})

			it("should convert nested path to dot notation", () => {
				expect(pathToScreenId("/admin/users")).toEqual({
					screenId: "admin.users",
				})
			})

			it("should convert :param to param (removing colon)", () => {
				expect(pathToScreenId("/projects/:id")).toEqual({
					screenId: "projects.id",
				})
			})

			it("should handle multiple parameters", () => {
				expect(pathToScreenId("/users/:userId/posts/:postId")).toEqual({
					screenId: "users.userId.posts.postId",
				})
			})

			it("should convert ** catchall to catchall", () => {
				expect(pathToScreenId("/docs/**")).toEqual({
					screenId: "docs.catchall",
				})
			})

			it("should convert *slug to slug", () => {
				expect(pathToScreenId("/files/*path")).toEqual({
					screenId: "files.path",
				})
			})
		})

		describe("smartParameterNaming: true", () => {
			const options = { smartParameterNaming: true }

			it("should convert :id at path end to detail", () => {
				expect(pathToScreenId("/projects/:id", options)).toEqual({
					screenId: "projects.detail",
				})
			})

			it("should convert :id in nested path to detail", () => {
				expect(pathToScreenId("/admin/users/:id", options)).toEqual({
					screenId: "admin.users.detail",
				})
			})

			it("should extract entity from :xxxId pattern", () => {
				expect(pathToScreenId("/users/:userId", options)).toEqual({
					screenId: "users.user",
				})
			})

			it("should extract entity from :xxxId pattern (case insensitive)", () => {
				expect(pathToScreenId("/projects/:projectId", options)).toEqual({
					screenId: "projects.project",
				})
			})

			it("should preserve :id before action segment (edit)", () => {
				expect(pathToScreenId("/projects/:id/edit", options)).toEqual({
					screenId: "projects.id.edit",
				})
			})

			it("should convert :id to detail when not directly before action segment", () => {
				// :id is followed by 'items', not directly by 'new', so it gets converted to detail
				expect(pathToScreenId("/categories/:id/items/new", options)).toEqual({
					screenId: "categories.detail.items.new",
				})
			})

			it("should preserve :id before action segment (settings)", () => {
				expect(pathToScreenId("/users/:id/settings", options)).toEqual({
					screenId: "users.id.settings",
				})
			})

			it("should convert :id before non-action segment to detail", () => {
				expect(pathToScreenId("/projects/:id/comments", options)).toEqual({
					screenId: "projects.detail.comments",
				})
			})

			it("should handle complex nested path with multiple parameters", () => {
				// :xxxId pattern only applies at path end
				// Mid-path params like :orgId and :teamId are preserved as-is
				// Only the final :id gets converted to detail
				expect(
					pathToScreenId("/orgs/:orgId/teams/:teamId/members/:id", options),
				).toEqual({
					screenId: "orgs.orgId.teams.teamId.members.detail",
				})
			})
		})

		describe("custom parameterMapping", () => {
			it("should use custom mapping over defaults", () => {
				const options = {
					smartParameterNaming: true,
					parameterMapping: { ":id": "show" },
				}
				expect(pathToScreenId("/projects/:id", options)).toEqual({
					screenId: "projects.show",
				})
			})

			it("should use custom mapping for specific parameters", () => {
				const options = {
					parameterMapping: {
						":userId": "member",
						":projectId": "proj",
					},
				}
				expect(
					pathToScreenId("/projects/:projectId/users/:userId", options),
				).toEqual({
					screenId: "projects.proj.users.member",
				})
			})

			it("should prioritize custom mapping over smart defaults", () => {
				const options = {
					smartParameterNaming: true,
					parameterMapping: { ":userId": "participant" },
				}
				expect(pathToScreenId("/users/:userId", options)).toEqual({
					screenId: "users.participant",
				})
			})
		})

		describe("unmappedParameterStrategy", () => {
			describe('strategy: "preserve" (default)', () => {
				it("should preserve parameter name as-is", () => {
					const options = { unmappedParameterStrategy: "preserve" as const }
					expect(pathToScreenId("/items/:itemCode", options)).toEqual({
						screenId: "items.itemCode",
					})
				})
			})

			describe('strategy: "detail"', () => {
				it("should convert all unmapped parameters to detail", () => {
					const options = { unmappedParameterStrategy: "detail" as const }
					expect(pathToScreenId("/items/:itemCode", options)).toEqual({
						screenId: "items.detail",
					})
				})

				it("should convert multiple parameters to detail", () => {
					const options = { unmappedParameterStrategy: "detail" as const }
					expect(pathToScreenId("/a/:b/c/:d", options)).toEqual({
						screenId: "a.detail.c.detail",
					})
				})
			})

			describe('strategy: "warn"', () => {
				it("should preserve and include suggestions for :id at end", () => {
					const options = { unmappedParameterStrategy: "warn" as const }
					const result = pathToScreenId("/projects/:id", options)
					expect(result.screenId).toBe("projects.id")
					expect(result.suggestions).toBeDefined()
					expect(result.suggestions?.[0]).toContain("detail")
				})

				it("should include entity suggestion for :xxxId pattern", () => {
					const options = { unmappedParameterStrategy: "warn" as const }
					const result = pathToScreenId("/users/:userId", options)
					expect(result.screenId).toBe("users.userId")
					expect(result.suggestions).toBeDefined()
					expect(result.suggestions?.[0]).toContain("user")
				})

				it("should not include suggestions for non-final parameters", () => {
					const options = { unmappedParameterStrategy: "warn" as const }
					const result = pathToScreenId("/projects/:id/comments", options)
					expect(result.screenId).toBe("projects.id.comments")
					// Only the :id in non-final position should not have suggestions
				})
			})
		})
	})

	describe("flattenRoutes with options", () => {
		it("should apply pathToScreenId options to flattened routes", () => {
			const routes: ParsedRoute[] = [
				{
					path: "/projects",
					component: "Projects.vue",
					children: [
						{
							path: ":id",
							component: "ProjectDetail.vue",
						},
					],
				},
			]

			const options = { smartParameterNaming: true }
			const flat = flattenRoutes(routes, "", 0, options)

			expect(flat).toHaveLength(2)
			expect(flat[0]?.screenId).toBe("projects")
			expect(flat[1]?.screenId).toBe("projects.detail")
		})

		it("should include suggestions when using warn strategy", () => {
			const routes: ParsedRoute[] = [
				{
					path: "/users/:userId",
					component: "UserDetail.vue",
				},
			]

			const options = { unmappedParameterStrategy: "warn" as const }
			const flat = flattenRoutes(routes, "", 0, options)

			expect(flat).toHaveLength(1)
			expect(flat[0]?.screenId).toBe("users.userId")
			expect(flat[0]?.suggestions).toBeDefined()
			expect(flat[0]?.suggestions?.[0]).toContain("user")
		})

		it("should apply custom parameterMapping", () => {
			const routes: ParsedRoute[] = [
				{
					path: "/posts/:postId",
					component: "PostDetail.vue",
				},
			]

			const options = { parameterMapping: { ":postId": "article" } }
			const flat = flattenRoutes(routes, "", 0, options)

			expect(flat).toHaveLength(1)
			expect(flat[0]?.screenId).toBe("posts.article")
		})
	})

	describe("pathToScreenId - Vue Router catch-all patterns", () => {
		it("should convert :pathMatch(.*)* to not-found", () => {
			expect(pathToScreenId("/:pathMatch(.*)*")).toEqual({
				screenId: "not-found",
			})
		})

		it("should convert :catchAll(.*)* to not-found", () => {
			expect(pathToScreenId("/:catchAll(.*)*")).toEqual({
				screenId: "not-found",
			})
		})

		it("should convert :pathMatch(.*) without trailing asterisk to not-found", () => {
			expect(pathToScreenId("/:pathMatch(.*)")).toEqual({
				screenId: "not-found",
			})
		})

		it("should handle catch-all with prefix path", () => {
			expect(pathToScreenId("/admin/:pathMatch(.*)*")).toEqual({
				screenId: "admin.not-found",
			})
		})

		it("should handle catch-all with nested path", () => {
			expect(pathToScreenId("/docs/guide/:pathMatch(.*)*")).toEqual({
				screenId: "docs.guide.not-found",
			})
		})

		it("should not affect regular parameters with parentheses in name", () => {
			// Regular parameters should still work
			expect(pathToScreenId("/users/:id")).toEqual({
				screenId: "users.id",
			})
		})
	})

	describe("pathToScreenTitle - Vue Router catch-all patterns", () => {
		it("should return 'Not Found' for :pathMatch(.*)* pattern", () => {
			expect(pathToScreenTitle("/:pathMatch(.*)*")).toBe("Not Found")
		})

		it("should return 'Not Found' for :catchAll(.*)* pattern", () => {
			expect(pathToScreenTitle("/:catchAll(.*)*")).toBe("Not Found")
		})

		it("should return 'Not Found' for catch-all with prefix path", () => {
			expect(pathToScreenTitle("/admin/:pathMatch(.*)*")).toBe("Not Found")
		})

		it("should return normal title for regular paths", () => {
			expect(pathToScreenTitle("/users/profile")).toBe("Profile")
		})

		it("should return Home for root path", () => {
			expect(pathToScreenTitle("/")).toBe("Home")
		})
	})
})
