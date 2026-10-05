package com.oj.friend.controller.question;


import com.oj.common.controller.BaseController;
import com.oj.common.entity.Result;
import com.oj.common.entity.TableDataInfo;
import com.oj.friend.entity.question.dto.QuestionQueryDto;
import com.oj.friend.entity.question.vo.QuestionDetailVo;
import com.oj.friend.service.question.IQuestionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "C端题目")
@RestController
@RequestMapping("/question")
public class QuestionController extends BaseController {


    @Autowired
    private IQuestionService questionService;


    @Operation(summary = "C端题目列表")
    @GetMapping("/semiLogin/list") //semiLogin是为了让所有的用户包括游客也可以使用
    public TableDataInfo list(@Validated @ParameterObject QuestionQueryDto questionQueryDto) {
        return questionService.list(questionQueryDto);
    }

    @Operation(summary = "获取题目详情")
    @GetMapping("/detail")
    public Result<QuestionDetailVo> detail(Long questionId) {
        return Result.success(questionService.detail(questionId));
    }

    @Operation(summary = "获取上一题题目详情")
    @GetMapping("/preQuestion")
    public Result<String> preQuestionDetail(Long questionId) {
        return Result.success(questionService.preQuestion(questionId));
    }

    @Operation(summary = "获取下一题题目详情")
    @GetMapping("/nextQuestion")
    public Result<String> nextQuestionDetail(Long questionId) {
        return Result.success(questionService.nextQuestion(questionId));
    }

}
