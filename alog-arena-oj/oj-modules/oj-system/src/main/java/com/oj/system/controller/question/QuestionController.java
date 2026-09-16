package com.oj.system.controller.question;

import com.oj.common.controller.BaseController;
import com.oj.common.entity.Result;
import com.oj.common.entity.TableDataInfo;
import com.oj.system.entity.question.dto.QuestionAddDto;
import com.oj.system.entity.question.dto.QuestionEditDto;
import com.oj.system.entity.question.dto.QuestionQueryDto;
import com.oj.system.entity.question.vo.QuestionDetailVO;
import com.oj.system.service.question.IQuestionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/question")
@Tag(name = "题目管理接口")
public class QuestionController extends BaseController {

    @Autowired
    private IQuestionService questionService;

    @Operation(summary = "题目列表")
    @GetMapping("/list")
    public TableDataInfo list(@Validated QuestionQueryDto questionQueryDto) {
       return getDataTable(questionService.list(questionQueryDto));
    }

    // 接口地址/question/add
    @Operation(summary = "新增题目")
    @PostMapping("/add")
    public Result<Void> add(@RequestBody QuestionAddDto questionAddDto) {
        return toResult(questionService.add(questionAddDto));
    }

    @Operation(summary = "获取题目详情")
    @GetMapping("/detail")
    public Result<QuestionDetailVO> detail(Long questionId) {
        return Result.success(questionService.detail(questionId));
    }

    @Operation(summary = "编辑题目")
    @PutMapping("/edit")
    public Result<Void> edit(@RequestBody QuestionEditDto questionEditDto) {
        return toResult(questionService.edit(questionEditDto));
    }

    @Operation(summary = "删除题目")
    @DeleteMapping("/delete")
    public Result<Void> delete(Long questionId) {
        return toResult(questionService.delete(questionId));
    }

}
