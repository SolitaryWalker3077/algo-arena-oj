package com.oj.system.controller;


import com.oj.common.entity.Result;
import com.oj.system.entity.dto.LoginDto;
import com.oj.system.entity.dto.SysUserDto;
import com.oj.system.entity.vo.SysUserVo;
import com.oj.system.service.ISysUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.Parameters;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.bouncycastle.asn1.dvcs.DVCSObjectIdentifiers;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/sysuser")
@Tag(name = "管理员用户API")
public class SysUserController {

    @Autowired
    private ISysUserService sysUserService;

    @Operation(summary = "管理员登录",description = "根据账号密码进行管理员登录")
    @ApiResponse(responseCode = "1000",description = "操作成功")
    @ApiResponse(responseCode = "2000",description = "服务器繁忙,稍后重试")
    @ApiResponse(responseCode = "3102",description = "用户不存在")
    @ApiResponse(responseCode = "3103",description = "用户名或密码错误")
    @GetMapping("/login")
    public Result<String> login(@RequestBody LoginDto loginDTO) {
        return sysUserService.login(loginDTO.getUserAccount(),loginDTO.getPassword());
    }

    @Operation(summary = "新增管理员",description = "根据用户信息新增管理员")
    @ApiResponse(responseCode = "1000",description = "操作成功")
    @ApiResponse(responseCode = "2000",description = "服务器繁忙,稍后重试")
    @ApiResponse(responseCode = "3101",description = "用户已存在")
    @PostMapping("/add")
    public Result<Void> add(@RequestBody SysUserDto sysUserDto) {
        return null;
    }

    @Operation(summary = "删除管理员",description = "根据用户Id删除管理员")
    @ApiResponse(responseCode = "1000", description = "成功删除⽤⼾")
    @ApiResponse(responseCode = "2000", description = "服务繁忙请稍后重试")
    @ApiResponse(responseCode = "3101", description = "⽤⼾不存在")
    @Parameters(value = {
            @Parameter(name = "userId",in = ParameterIn.PATH,description = "用户Id")
    })
    @DeleteMapping("/{userId}")
    public Result<Void> delete(@PathVariable Long userId) {
        return null;
    }

    @Operation(summary = "用户详情",description = "根据查询条件查询⽤⼾详情")
    @ApiResponse(responseCode = "1000", description = "成功获取⽤⼾信息")
    @ApiResponse(responseCode = "2000", description = "服务繁忙请稍后重试")
    @ApiResponse(responseCode = "3101", description = "⽤⼾不存在")
    @Parameters(value = {
            @Parameter(name = "userId",in = ParameterIn.QUERY,description = "用户Id"),
            @Parameter(name = "sex",in = ParameterIn.QUERY,description = "用户性别")
    })
    @GetMapping("/detail")
    public Result<SysUserVo> detail(@RequestParam(required = true) Long userId, @RequestParam(required = true) String sex) {
        return null;
    }
}
