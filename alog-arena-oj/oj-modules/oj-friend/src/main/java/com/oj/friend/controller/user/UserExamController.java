package com.oj.friend.controller.user;


import com.oj.common.constants.HttpConstants;
import com.oj.common.controller.BaseController;
import com.oj.common.entity.Result;
import com.oj.friend.entity.exam.dto.ExamDto;
import com.oj.friend.service.user.IUserExamService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@Tag(name = "竞赛报名")
@RestController
@RequestMapping("/user/exam")
public class UserExamController extends BaseController {



    @Autowired
    private IUserExamService userExamService;

    @PostMapping("/enter")
    @Operation(summary = "新增竞赛报名信息")
    public Result<Void> enter(@RequestHeader(HttpConstants.AUTHENTICATION) String token , @RequestBody ExamDto examDto) {
        return  toResult(userExamService.enter(token, examDto.getExamId()));
    }

}
